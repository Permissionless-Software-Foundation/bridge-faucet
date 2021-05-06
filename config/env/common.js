/*
  This file is used to store unsecure, application-specific data common to all
  environments.
*/

module.exports = {
  port: process.env.PORT || 5001,
  logPass: 'test',
  emailServer: process.env.EMAILSERVER ? process.env.EMAILSERVER : 'mail.someserver.com',
  emailUser: process.env.EMAILUSER ? process.env.EMAILUSER : 'noreply@someserver.com',
  emailPassword: process.env.EMAILPASS ? process.env.EMAILPASS : 'emailpassword',

  tokenID: process.env.tokenID,
  WIF: process.env.WIF,

  AVAX_IP: process.env.AVAX_IP,
  AVAX_PORT: process.env.AVAX_PORT,
  AVAX_PRIVATE_KEY: process.env.AVAX_PRIVATE_KEY,
  AVAX_TOKEN: process.env.AVAX_TOKEN,
}
