exports.errorHandler = (err, req, res, next) => {
    if (err && typeof err === 'object' && err.stack) {
        console.error(err.stack);
    } else {
        console.error(err);
    }
    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Server Error'
    });
};