/**
 * Contact upload security verification (unit + optional live API probes).
 * Run: npm run verify:uploads
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const {
    MAX_FILES,
    MAX_BYTES,
    sanitizeFilename,
    detectExecutableSignature,
    detectProfile,
    validateContactUpload,
    validateContactUploads,
} = require('../utils/contactUploadValidation');

const ROOT = path.join(__dirname, '..');
const FIXTURES = path.join(ROOT, 'scripts', 'fixtures', 'upload-security');

function multerFile(name, mime, buffer) {
    return {
        fieldname: 'files',
        originalname: name,
        encoding: '7bit',
        mimetype: mime,
        size: buffer.length,
        buffer,
    };
}

function record(results, name, pass, detail = '') {
    results.push({ name, pass, detail });
}

function ensureFixtures() {
    fs.mkdirSync(FIXTURES, { recursive: true });

    const png = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const pdf = Buffer.from('%PDF-1.4\n%fake\n');
    const webp = Buffer.concat([
        Buffer.from('RIFF', 'ascii'),
        Buffer.from([0x24, 0x00, 0x00, 0x00]),
        Buffer.from('WEBP', 'ascii'),
        Buffer.from('FAKE', 'ascii'),
    ]);
    const doc = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00, 0x00, 0x00]);
    const docx = Buffer.from('PK\x03\x04word/document.xml[Content_Types].xml', 'latin1');
    const pe = Buffer.from('MZFAKE_EXECUTABLE');
    const pngClaimingPdf = png;

    const files = {
        'valid.png': png,
        'valid.jpg': jpeg,
        'valid.pdf': pdf,
        'valid.webp': webp,
        'valid.doc': doc,
        'valid.docx': docx,
        'fake-exe.bin': pe,
        'png-as-pdf.bin': pngClaimingPdf,
    };

    for (const [name, buf] of Object.entries(files)) {
        fs.writeFileSync(path.join(FIXTURES, name), buf);
    }
}

function runUnitTests(results) {
    ensureFixtures();

    const png = fs.readFileSync(path.join(FIXTURES, 'valid.png'));
    const jpeg = fs.readFileSync(path.join(FIXTURES, 'valid.jpg'));
    const pdf = fs.readFileSync(path.join(FIXTURES, 'valid.pdf'));
    const webp = fs.readFileSync(path.join(FIXTURES, 'valid.webp'));
    const doc = fs.readFileSync(path.join(FIXTURES, 'valid.doc'));
    const docx = fs.readFileSync(path.join(FIXTURES, 'valid.docx'));
    const pe = fs.readFileSync(path.join(FIXTURES, 'fake-exe.bin'));

    const validCases = [
        ['valid png', multerFile('scan.png', 'image/png', png)],
        ['valid jpeg', multerFile('photo.jpg', 'image/jpeg', jpeg)],
        ['valid pdf', multerFile('invoice.pdf', 'application/pdf', pdf)],
        ['valid webp', multerFile('shot.webp', 'image/webp', webp)],
        ['valid doc', multerFile('letter.doc', 'application/msword', doc)],
        ['valid docx', multerFile('letter.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', docx)],
    ];

    for (const [label, file] of validCases) {
        const result = validateContactUpload(file);
        record(results, `accept ${label}`, result.ok, result.code);
    }

    record(
        results,
        'reject pe executable magic',
        validateContactUpload(multerFile('notes.pdf', 'application/pdf', pe)).code === 'FILE_EXECUTABLE'
    );

    const spoof = validateContactUpload(multerFile('evil.pdf', 'application/pdf', png));
    record(
        results,
        'reject mime spoof png as pdf',
        spoof.code === 'FILE_MISMATCH' || spoof.code === 'FILE_MAGIC',
        spoof.code
    );

    record(
        results,
        'reject extension spoof pdf as png',
        validateContactUpload(multerFile('evil.png', 'image/png', pdf)).code === 'FILE_MISMATCH'
    );

    record(
        results,
        'reject double extension',
        validateContactUpload(multerFile('invoice.pdf.exe', 'application/pdf', pdf)).code === 'FILE_EXECUTABLE'
    );

    record(
        results,
        'reject blocked extension',
        validateContactUpload(multerFile('payload.exe', 'application/pdf', pdf)).code === 'FILE_EXECUTABLE'
    );

    record(
        results,
        'reject oversize file',
        validateContactUpload(
            multerFile('big.pdf', 'application/pdf', Buffer.alloc(MAX_BYTES + 1, 0x25))
        ).code === 'FILE_TOO_LARGE'
    );

    record(
        results,
        'reject empty file',
        validateContactUpload(multerFile('empty.pdf', 'application/pdf', Buffer.alloc(0))).code === 'FILE_EMPTY'
    );

    record(
        results,
        'reject too many files',
        validateContactUploads(Array.from({ length: MAX_FILES + 1 }, () => multerFile('a.pdf', 'application/pdf', pdf)))
            .code === 'FILE_COUNT'
    );

    const sanitized = sanitizeFilename('../../etc/passwd.pdf.exe');
    record(results, 'sanitize path traversal', !sanitized.includes('/') && !sanitized.includes('\\'), sanitized);
    record(results, 'sanitize strips dangerous ext', !sanitized.endsWith('.exe'), sanitized);
    record(results, 'sanitize keeps allowed ext', sanitized.endsWith('.pdf'), sanitized);

    const unicode = sanitizeFilename('facture été (1).pdf');
    record(results, 'sanitize unicode filename', /^[a-zA-Z0-9._-]+\.pdf$/.test(unicode), unicode);

    record(results, 'detectProfile png', detectProfile(png)?.id === 'png');
    record(results, 'detectProfile pe', detectExecutableSignature(pe) === 'pe_executable');
}

function buildValidFormData() {
    const pdf = fs.readFileSync(path.join(FIXTURES, 'valid.pdf'));
    const form = new FormData();
    form.set('subject', 'Security test');
    form.set('name', 'Upload Audit');
    form.set('country', 'MA');
    form.set('response_language', 'en');
    form.set('service', 'autre');
    form.set('phone_prefix', 'MA|212');
    form.set('phone_local', '612345678');
    form.set('email', 'audit@example.com');
    form.set('comment', 'Automated upload security probe from verify-upload-security.js');
    form.append('files', new Blob([pdf], { type: 'application/pdf' }), 'probe.pdf');
    return form;
}

async function runLiveTests(results, baseUrl) {
    const rejectCases = [
        {
            name: 'live reject exe disguised as pdf',
            filename: 'malware.pdf',
            mime: 'application/pdf',
            buffer: fs.readFileSync(path.join(FIXTURES, 'fake-exe.bin')),
            expectStatus: 400,
            expectCode: 'FILE_EXECUTABLE',
        },
        {
            name: 'live reject png mime spoof',
            filename: 'spoof.pdf',
            mime: 'application/pdf',
            buffer: fs.readFileSync(path.join(FIXTURES, 'valid.png')),
            expectStatus: 400,
            expectCode: ['FILE_MAGIC', 'FILE_MISMATCH'],
        },
    ];

    for (const testCase of rejectCases) {
        const form = new FormData();
        form.set('subject', 'Security test');
        form.set('name', 'Upload Audit');
        form.set('country', 'MA');
        form.set('response_language', 'en');
        form.set('service', 'autre');
        form.set('phone_prefix', 'MA|212');
        form.set('phone_local', '612345678');
        form.set('email', 'audit@example.com');
        form.set('comment', 'Automated upload security probe from verify-upload-security.js');
        form.append(
            'files',
            new Blob([testCase.buffer], { type: testCase.mime }),
            testCase.filename
        );

        const res = await fetch(`${baseUrl}/api/contact`, { method: 'POST', body: form });
        let body = {};
        try {
            body = await res.json();
        } catch {
            body = {};
        }

        const expectedCodes = Array.isArray(testCase.expectCode) ? testCase.expectCode : [testCase.expectCode];
        const pass = res.status === testCase.expectStatus && expectedCodes.includes(body.code);
        record(results, testCase.name, pass, `status=${res.status} code=${body.code || 'none'}`);
    }

    const wrongField = new FormData();
    wrongField.set('subject', 'Security test');
    wrongField.set('name', 'Upload Audit');
    wrongField.set('country', 'MA');
    wrongField.set('response_language', 'en');
    wrongField.set('service', 'autre');
    wrongField.set('phone_prefix', 'MA|212');
    wrongField.set('phone_local', '612345678');
    wrongField.set('email', 'audit@example.com');
    wrongField.set('comment', 'Automated upload security probe from verify-upload-security.js');
    wrongField.append(
        'attachment',
        new Blob([fs.readFileSync(path.join(FIXTURES, 'valid.pdf'))], { type: 'application/pdf' }),
        'probe.pdf'
    );

    const wrongFieldRes = await fetch(`${baseUrl}/api/contact`, { method: 'POST', body: wrongField });
    let wrongFieldBody = {};
    try {
        wrongFieldBody = await wrongFieldRes.json();
    } catch {
        wrongFieldBody = {};
    }

    record(
        results,
        'live reject unexpected field name',
        wrongFieldRes.status === 400 && wrongFieldBody.code === 'FILE_REJECTED',
        `status=${wrongFieldRes.status} code=${wrongFieldBody.code || 'none'}`
    );
}

async function main() {
    const results = [];
    runUnitTests(results);

    const baseUrl = (process.argv[2] || process.env.PUBLIC_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

    try {
        const health = await fetch(`${baseUrl}/health`);
        if (health.ok) {
            await runLiveTests(results, baseUrl);
        } else {
            record(results, 'live API probes', true, 'skipped (health check failed)');
        }
    } catch {
        record(results, 'live API probes', true, 'skipped (server not reachable)');
    }

    const failed = results.filter((r) => !r.pass);
    const report = {
        generatedAt: new Date().toISOString(),
        summary: {
            total: results.length,
            passed: results.length - failed.length,
            failed: failed.length,
        },
        results,
    };

    const outPath = path.join(ROOT, 'scripts', 'upload-security-report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

    console.log('Contact upload security verification\n');
    for (const row of results) {
        console.log(`${row.pass ? 'OK  ' : 'FAIL'} ${row.name}${row.detail ? ` — ${row.detail}` : ''}`);
    }

    console.log(`\nSummary: ${report.summary.passed}/${report.summary.total} passed`);
    console.log(`Report: ${path.relative(ROOT, outPath)}`);

    process.exit(failed.length ? 1 : 0);
}

main();
