const 
  fs = require('fs'),
  jsyaml = require('js-yaml'),
  SchemaValidator = require('./fooschemavalidator')

const doc = jsyaml.load(fs.readFileSync('./test/docs/simple.yaml', 'utf8'))
console.log(JSON.stringify(doc, null, 2))

const validator = SchemaValidator.loadSchema('./test/schema1.yaml')
try {
  console.log(validator.validate(doc))
} catch (err) {
  console.error(`ERROR: ${err.message}`)
}
