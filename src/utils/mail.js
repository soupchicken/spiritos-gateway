const nodemailer = require('nodemailer');
const PropertiesReader = require('properties-reader');
const properties = PropertiesReader(process.env.CONFIG_FILE);

var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: properties.get('gateway.api.verify.email.account'),
    pass: properties.get('gateway.api.verify.email.password')
  }
});

const mail = (mail_link, type, cb) => {
  let mail_options = {
    from: properties.get('gateway.api.verify.email.from'),
    to: mail_link.email
  };

  switch(type.toUpperCase()){
    case 'RECOVERY':
      mail_options.subject = 'Recover your SpiritOS Account';
      mail_options.text = 'Recover your SpiritOS Account';
      mail_options.html = `<a href=${mail_link.recover_url()}>Click to recover your SpiritOS account</a>`;
    break;

    case 'VERIFY':
      mail_options.subject = 'Activate your SpiritOS Account';
      mail_options.text = 'Activate your SpiritOS Account';
      mail_options.html = `<a href=${mail_link.verification_url()}>Click to activate your SpiritOS account</a>`
      break;

    case 'BETA_SIGNUP':
      mail_options.subject = 'Private Beta Request';
      mail_options.text = 'Sign me up fuckers';
      mail_options.html = `EMAIL: ${mail_link.user_email} ORGANIZATION: ${mail_link.organization} COMMENTS: ${mail_link.comments}`
      break;
  }

  transporter.sendMail(mail_options, (error, response) => {
    if (error)
      return console.log(error);

    return cb(null, response);
  });
};

module.exports = mail;
