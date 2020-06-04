const path = require("path");

module.exports = () => ({
  defaultConnection: "default",
  connections: {
    default: {
      connector: "mongoose",
      uri: "mongodb://localhost:27000/",
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: "rawrxd",
        tls: true,
        tlsCertificateKeyFile: path.join(__dirname, "..", "x509-full.pem"),
        authMechanism: "MONGODB-X509",
        authSource: "$external",
        tlsAllowInvalidCertificates: true,
      },
      settings: {
        debug: false,
      },
    },
}});
