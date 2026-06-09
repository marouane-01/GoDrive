const path = require('path');

const MAX_FILES = 3;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILENAME_LENGTH = 120;
const MIN_BYTES_FOR_MAGIC = 12;

const DANGEROUS_EXTENSIONS = new Set([
    '.exe',
    '.bat',
    '.cmd',
    '.com',
    '.scr',
    '.pif',
    '.msi',
    '.msp',
    '.dll',
    '.sys',
    '.drv',
    '.vbs',
    '.vbe',
    '.js',
    '.jse',
    '.ws',
    '.wsf',
    '.wsh',
    '.ps1',
    '.psm1',
    '.sh',
    '.bash',
    '.zsh',
    '.fish',
    '.php',
    '.phtml',
    '.asp',
    '.aspx',
    '.jsp',
    '.jar',
    '.hta',
    '.reg',
    '.inf',
    '.lnk',
    '.app',
    '.deb',
    '.rpm',
    '.dmg',
    '.pkg',
    '.svg',
    '.html',
    '.htm',
    '.xhtml',
    '.cgi',
]);

const ALLOWED_PROFILES = [
    {
        id: 'pdf',
        extensions: ['.pdf'],
        mimes: ['application/pdf'],
        detect: (buf) => buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-',
    },
    {
        id: 'jpeg',
        extensions: ['.jpg', '.jpeg'],
        mimes: ['image/jpeg'],
        detect: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
    },
    {
        id: 'png',
        extensions: ['.png'],
        mimes: ['image/png'],
        detect: (buf) =>
            buf.length >= 8 &&
            buf[0] === 0x89 &&
            buf[1] === 0x50 &&
            buf[2] === 0x4e &&
            buf[3] === 0x47 &&
            buf[4] === 0x0d &&
            buf[5] === 0x0a &&
            buf[6] === 0x1a &&
            buf[7] === 0x0a,
    },
    {
        id: 'webp',
        extensions: ['.webp'],
        mimes: ['image/webp'],
        detect: (buf) =>
            buf.length >= 12 &&
            buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
            buf.subarray(8, 12).toString('ascii') === 'WEBP',
    },
    {
        id: 'doc',
        extensions: ['.doc'],
        mimes: ['application/msword'],
        detect: (buf) =>
            buf.length >= 8 &&
            buf[0] === 0xd0 &&
            buf[1] === 0xcf &&
            buf[2] === 0x11 &&
            buf[3] === 0xe0 &&
            buf[4] === 0xa1 &&
            buf[5] === 0xb1 &&
            buf[6] === 0x1a &&
            buf[7] === 0xe1,
    },
    {
        id: 'docx',
        extensions: ['.docx'],
        mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        detect: (buf) => {
            if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
                return false;
            }
            const sample = buf.subarray(0, Math.min(buf.length, 65536)).toString('latin1');
            return sample.includes('word/') || sample.includes('[Content_Types].xml');
        },
    },
];

const ALLOWED_EXTENSIONS = new Set(ALLOWED_PROFILES.flatMap((p) => p.extensions));
const ALLOWED_MIMES = new Set(ALLOWED_PROFILES.flatMap((p) => p.mimes));

function detectExecutableSignature(buffer) {
    if (!buffer || buffer.length < 2) {
        return null;
    }

    if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
        return 'pe_executable';
    }

    if (
        buffer.length >= 4 &&
        buffer[0] === 0x7f &&
        buffer[1] === 0x45 &&
        buffer[2] === 0x4c &&
        buffer[3] === 0x46
    ) {
        return 'elf_executable';
    }

    if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
        return 'script_shebang';
    }

    if (
        buffer.length >= 4 &&
        ((buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa && buffer[3] === 0xce) ||
            (buffer[0] === 0xce && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe) ||
            (buffer[0] === 0xcf && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe))
    ) {
        return 'mach_o_executable';
    }

    return null;
}

function getExtension(filename) {
    return path.extname(String(filename || '')).toLowerCase();
}

function hasDangerousExtension(filename) {
    const lower = String(filename || '').toLowerCase().replace(/\\/g, '/');
    const base = path.basename(lower);
    const segments = base.split('.');

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (!segment) continue;
        const candidate = `.${segment}`;
        if (DANGEROUS_EXTENSIONS.has(candidate)) {
            return candidate;
        }
    }

    return null;
}

function sanitizeFilename(original) {
    const raw = String(original || 'attachment').replace(/\0/g, '');
    const baseName = path.basename(raw.replace(/\\/g, '/'));
    const ext = getExtension(baseName);
    const stem = path.basename(baseName, ext);

    const safeStem = stem
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .replace(/^[._-]+/, '')
        .slice(0, MAX_FILENAME_LENGTH) || 'attachment';

    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '';
    const sanitized = `${safeStem}${safeExt}`.slice(0, MAX_FILENAME_LENGTH);

    return sanitized || 'attachment';
}

function detectProfile(buffer) {
    return ALLOWED_PROFILES.find((profile) => profile.detect(buffer)) || null;
}

function validateContactUpload(file) {
    if (!file || !Buffer.isBuffer(file.buffer)) {
        return {
            ok: false,
            code: 'FILE_INVALID',
            message: 'Invalid upload payload.',
        };
    }

    if (file.buffer.length === 0) {
        return {
            ok: false,
            code: 'FILE_EMPTY',
            message: 'Empty files are not allowed.',
        };
    }

    if (file.size > MAX_BYTES || file.buffer.length > MAX_BYTES) {
        return {
            ok: false,
            code: 'FILE_TOO_LARGE',
            message: 'Each file must be at most 10 MB.',
        };
    }

    const dangerousExt = hasDangerousExtension(file.originalname);
    if (dangerousExt) {
        return {
            ok: false,
            code: 'FILE_EXECUTABLE',
            message: 'Executable or script uploads are not allowed.',
        };
    }

    const extension = getExtension(file.originalname);
    if (!ALLOWED_EXTENSIONS.has(extension)) {
        return {
            ok: false,
            code: 'FILE_EXTENSION',
            message: 'Unsupported file extension. Allowed: PDF, JPG, PNG, WebP, DOC, DOCX.',
        };
    }

    const claimedMime = String(file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIMES.has(claimedMime)) {
        return {
            ok: false,
            code: 'FILE_TYPE',
            message: 'Unsupported file type. Allowed: PDF, JPG, PNG, WebP, DOC, DOCX.',
        };
    }

    if (file.buffer.length < MIN_BYTES_FOR_MAGIC) {
        return {
            ok: false,
            code: 'FILE_MAGIC',
            message: 'File content does not match its type.',
        };
    }

    const executable = detectExecutableSignature(file.buffer);
    if (executable) {
        return {
            ok: false,
            code: 'FILE_EXECUTABLE',
            message: 'Executable or script uploads are not allowed.',
        };
    }

    const profile = detectProfile(file.buffer);
    if (!profile) {
        return {
            ok: false,
            code: 'FILE_MAGIC',
            message: 'File content does not match its type.',
        };
    }

    if (!profile.extensions.includes(extension)) {
        return {
            ok: false,
            code: 'FILE_MISMATCH',
            message: 'File extension does not match file content.',
        };
    }

    if (!profile.mimes.includes(claimedMime)) {
        return {
            ok: false,
            code: 'FILE_MISMATCH',
            message: 'File type does not match file content.',
        };
    }

    return {
        ok: true,
        code: 'OK',
        sanitizedName: sanitizeFilename(file.originalname),
        detectedType: profile.id,
        contentType: profile.mimes[0],
    };
}

function validateContactUploads(files) {
    const list = Array.isArray(files) ? files : [];

    if (list.length > MAX_FILES) {
        return {
            ok: false,
            code: 'FILE_COUNT',
            message: 'Too many files attached.',
        };
    }

    const validated = [];

    for (const file of list) {
        const result = validateContactUpload(file);
        if (!result.ok) {
            return result;
        }

        validated.push({
            ...file,
            originalname: result.sanitizedName,
            mimetype: result.contentType,
            detectedType: result.detectedType,
        });
    }

    return { ok: true, code: 'OK', files: validated };
}

module.exports = {
    MAX_FILES,
    MAX_BYTES,
    ALLOWED_EXTENSIONS,
    ALLOWED_MIMES,
    DANGEROUS_EXTENSIONS,
    sanitizeFilename,
    detectExecutableSignature,
    detectProfile,
    validateContactUpload,
    validateContactUploads,
};
