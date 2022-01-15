const fs = require('fs')

const print = async () => {
await fs.readFile('log.json', 'utf8', function readFileCallback(err, data) {
  if (err) {
    console.log(err);
  } else {
      const obj = JSON.parse(data); //old object
      console.table(obj)
    }
})
}

print().then((res) => console.log(res))

