const fs = require('fs')

const writeLog = async(info) => {
  await fs.readFile('log.json', 'utf8', function readFileCallback(err, data){
    if (err){
      console.log(err);
    } else {
      const obj = JSON.parse(data); //old object
      const newObj = [...obj, ...info]
      console.table(newObj)
      const json = JSON.stringify(newObj); //convert it back to json
      fs.writeFile('log.json', json, 'utf8', (res, err) => {
        if (err) {
          console.log('error')
        } else {
          console.log('logged')
        }
      }); // write it back
    }});
}

module.exports = writeLog
