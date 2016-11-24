var app = angular.module('ep', []);
app.run();


app.factory('Products', ['$http', function($http){
  var url   = "data/products.csv";
  return $http.get(url).then(function(response){
     return Papa.parse(response.data, { header: true, dynamicTyping: true });
  });
}]);

app.controller('ProductsCtrl', ['Products', function(Products) {
  var self = this;
  self.data = {};
  Products.then(function(d) {
    // Transpose rows
    data = {};
    self.names = [];

    for(var i = 0; i < d.data.length; i++) {
      var row = d.data[i];
      for(var key in row) {
        if (key === 'Product') {
          self.names.push(row[key]);
        } else {
          data[key] = data[key] || [];
          data[key].push(row[key])
        }
      }
    }

    self.data = data;
  })

  self.divide = function(key) {
    shouldDivide = false;
    switch (key) {
      case 'Calories per 100g':
      case 'GMO Free':
      case 'Company':
        shouldDivide = true;
        break;
    }
    return shouldDivide;
  }
}]);