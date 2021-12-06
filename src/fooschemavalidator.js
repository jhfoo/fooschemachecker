const 
  fs = require('fs'),
  jsyaml = require('js-yaml')
  
const
  SCHEMA_ISARRAY = 'SchemaIsArray',
  SCHEMA_TYPE = 'SchemaType',
  SCHEMA_REGEX = 'SchemaRegex',
  SCHEMA_MANDATORY = 'SchemaMandatory',
  SCHEMA_TYPE_INT = 'int'
  SCHEMA_TYPE_KEYVALUEPAIRS = 'KeyValuePairs'

function isObject(obj) {
  return (typeof obj === 'object') && !(obj instanceof Array)
}

/// is boolean, int, or string
function isScalar(obj) {
  return typeof obj === 'number'
    || typeof obj === 'string'
    || typeof obj === 'boolean'
}

class SchemaValidator {
  constructor(schema) {
    this.schema = schema
  }

  static loadSchema(FilePath) {
    return new SchemaValidator(jsyaml.load(fs.readFileSync(FilePath)))
  }

  /// Validates properties of current node
  /// EXPECTED: hash or array
  /// UNEXPECTED: scalar (int, str, bool)
  validate(doc, schema) {
    if (!schema) {
      if (!this.schema) {
        throw new Error('Load schema before calling validate()')
      }
      schema = this.schema
    }

    // validate input
    if (isScalar(doc)) {
      throw new Error(`Unexpected type: ${typeof doc}. Should be hash or array.`)
    }

    console.log(JSON.stringify(schema, null, 2))
    if (isObject(doc)) {
      // iterate through each property
      Object.keys(doc).forEach((key) => {
        this.validateNode(key, doc[key], schema)

        // decide if need to traverse depth-first
        // only if not scalar
        if (isScalar(doc[key])) {
          console.log(`Stop nesting: key ${key}, reason SCALAR`)
        } else if (isObject(doc[key])) {
          // and not parent of key-value pair 
          if (SCHEMA_TYPE in schema[key]
            && schema[key][SCHEMA_TYPE] === SCHEMA_TYPE_KEYVALUEPAIRS) {
            console.log(`Stop nesting: key ${key}, reason ${SCHEMA_TYPE_KEYVALUEPAIRS}`)
          } else {
            // traverse depth-first
            this.validate(doc[key], schema[key])
          }
        } else if (Array.isArray(doc[key])) {
          doc[key].forEach((cell) => {
            console.log(`Validating cell in array`)
            // this.validateNode(key, cell, schema)
            this.validate(cell, schema[key])
          })
        } else {
          throw new Error(`Unhandled type: ${typeof doc[key]}`)
        }
      })

      // check for missing properties
      this.validateMandatory(doc, schema)
    } else if (Array.isArray(doc)) {
      doc.forEach((cell) => {
        console.log(`Validating cell in array`)
        // this.validateNode(key, cell, schema)
        this.validate(cell, schema)
      })
    }
    return true
  }

  /// Ensure mandatory keys are included
  validateMandatory(doc, schema) {
    console.log('Validating mandatory schema')
    console.log(JSON.stringify(schema, null, 2))
    Object.keys(schema).forEach((key) => {
      if (!key.startsWith('Schema') ) {
        console.log(`Validating mandatory key: ${key}`)
        // only validate if key is an object
        if (SCHEMA_MANDATORY in schema[key]
          && schema[key][SCHEMA_MANDATORY]
          && !(key in doc)) {
          throw new Error(`Missing mandatory key: ${key}`)
        }
      }
    })
  }

  /// Validates key of current node
  validateNode(key, node, schema) {
    console.log(`Validating key: ${key}`)
    // check: key is expected
    if (!Object.keys(schema).includes(key)) {
      throw new Error(`Unexpected key ${key}`)
    }

    // check: is/ is-not array
    if (SCHEMA_ISARRAY in schema[key]) {
      if (schema[key][SCHEMA_ISARRAY] && !Array.isArray(node)) {
        throw new Error(`Key type mismatch: Expect ARRAY for key ${key}`)
      }
      if (!schema[key][SCHEMA_ISARRAY] && Array.isArray(node)) {
        throw new Error(`Key type mismatch: Expect non-ARRAY for key ${key}`)
      }
    }

    // check: key type (int)
    if (SCHEMA_TYPE in schema[key]) {
      if (schema[key][SCHEMA_TYPE] === SCHEMA_TYPE_INT && !(typeof node === 'number')) {
        throw new Error(`Key type mismatch: Expect integer for key ${key}, received ${typeof node}`)
      }
    }

    // check: key type (string)
    if (SCHEMA_REGEX in schema[key]) {
      const re = new RegExp(schema[key][SCHEMA_REGEX])
      if (!node.match(re)) {
        throw new Error(`Key regex mismatch: key ${key} (expect ${schema[key][SCHEMA_REGEX]}, received ${node})`)
      }
    }
  }
}

module.exports = SchemaValidator

