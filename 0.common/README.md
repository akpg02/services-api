## Option A: Publish your package to npm (public or private)

1. npm login
2. Update the version number in the package.json
3. npm publish --access public

## Import into any microservice

1. npm install @gaeservices/common

```
const {foo} = require('@gaeservices/common')

OR

import {foo} from '@gaeservices/common'
```

## Option B: For local development: npm link

1. In the common directory, execute the following command
   - npm link
2. In each microservice folder:
   - npm link @gaeservices/common
3. In microservice's package.json

```
"dependencies": {
"@your-org/common-lib": "file:../common-lib"
}
```

### Note: Option A was used for this project
