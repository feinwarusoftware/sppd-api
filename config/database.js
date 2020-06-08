const path = require("path");
const fs = require("fs");

const {
  MONGO_HOST,
  MONGO_DB,
  MONGO_CERT,
} = process.env;

fs.writeFileSync(path.join(__dirname, "..", "mongo_cert.pem"), MONGO_CERT);

module.exports = () => ({
  defaultConnection: "default",
  connections: {
    default: {
      connector: "mongoose",
      uri: `mongodb://${MONGO_HOST}/`,
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: MONGO_DB,
        tls: true,
        tlsCertificateKeyFile: path.join(__dirname, "..", "mongo_cert.pem"),
        authMechanism: "MONGODB-X509",
        authSource: "$external",
        tlsAllowInvalidCertificates: true,
      },
      settings: {
        debug: false,
      },
    },
}});
