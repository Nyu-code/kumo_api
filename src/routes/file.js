const uuid = require('uuid').v4

const addFile = (req, res) => {
  const title = req.body.title
  const file = req.file
  if (!file)
    return res.status(400).json("Error: no file submited")

  console.log(title)
  console.log(file)
  return res.status(200).json({message: 'File successfully uploaded'})
}

module.exports = {addFile}