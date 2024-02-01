import bcrypt from 'bcryptjs'

bcrypt.genSalt(5, function (err, salt) {
  if (err) console.err(`Gen salt error: ${err}`)

  bcrypt.hash('secret', salt, function (err, hash) {
    if (err) console.err(`Hash error: ${err}`)
    console.log(hash)
  })
})
