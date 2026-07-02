const repository =
require("../repositories/client.repository");

async function registerClient(req, res) {
  try {

    const client =
      await repository.createClient(
        req.body
      );

    return res.status(201).json({
      success: true,
      data: client
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
}

module.exports = {
  registerClient
};