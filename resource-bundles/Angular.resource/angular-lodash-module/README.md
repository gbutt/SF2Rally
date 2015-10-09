angular-lodash-module - Use Lodash from an Angular Controller or Service
======


## Usage

1. get it 
   ```bower install angular-lodash-module
   ```
1. Add angular-lodash-module.js to your main file (index.html)

2. Add the module as a dependency in your App definition
  ```javascript
  var myapp = angular.module('MyApp', ['lodash'])
  ```

3. To use, add as an injected dependency to your Controller/Service and it is ready to use
    ```javascript
  angular.module('MyApp')
  .controller('MyCtrl', function ($scope, _) {
  ...
  //Use lodash
   _.each(...);
  ...
  ```

  References:
  
 Lodash:
 http://lodash.com/
 Stackoverflow:
 http://stackoverflow.com/questions/14968297/use-underscore-inside-controllers
 Github:
 https://github.com/kmc059000/angular-lodash-module
