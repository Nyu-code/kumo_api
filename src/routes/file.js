const uuid = require('uuid').v4

const addFile = (req, res) => {
  const title = req.body.title
  const file = req.file

  console.log(title)
  console.log(file)
  return res.json(true)
}

module.exports = {addFile}