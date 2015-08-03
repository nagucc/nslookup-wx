/* global process */

var env = process.env.NODE_ENV || 'production';

var config = {
  development: {
    port: 18080,
  },

  production: {
    port: 18080,
    qyh: {
        corpId: process.env.QYH_CORPID,
        secret: process.env.QYH_SECRET
    },
    notice: {
        token: process.env.NSLOOKUP_TOKEN,
        aesKey: process.env.NSLOOKUP_AESKEY,
        agentId: process.env.NSLOOKUP_AGENTID
    }
  }
};

module.exports = config[env];
