const { getBucket } =
require('../services/bucketStore');

const checkLimit = (req, res) => {

    const { clientKey } = req.body;

    if (!clientKey) {
        return res.status(400).json({
            message: 'clientKey is required'
        });
    }

    const bucket =
        getBucket(clientKey);

    const allowed =
        bucket.consume();

    return res.status(200).json({
        clientKey,
        allowed
    });
};

module.exports = {
    checkLimit
};