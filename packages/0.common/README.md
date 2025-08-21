# E-Services - Shared Files

Contains middlewares, configuration, utilities, etc. that are shared across microservices. 

## Getting Started

1. Ensure you have Node.js installed.
2. Create necessary .env files for each microservice. Note: a template of required environment variables will be made available.
3.  Update or add new configurations, utilities, middlewares, etc.

## Publish package to npm

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
