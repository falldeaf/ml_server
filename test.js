const dateformat = require('dateformat');
filename = dateformat(new Date(), 'dd-m-yy_H-MM-ss-l') + ".jpg";
console.log(filename);