if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position){
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
  };
}

var app = angular.module('ep', []);

app.factory('Products', ['$http', function($http){
  var url   = "data/products.csv";
  return $http.get(url).then(function(response){
     return Papa.parse(response.data, { header: true, dynamicTyping: true });
  });
}]);

fx.rates = {"base":"EUR","date":"2016-11-25","rates":{"AUD":1.423,"BGN":1.9558,"BRL":3.6394,"CAD":1.429,"CHF":1.0736,"CNY":7.3295,"CZK":27.039,"DKK":7.438,"GBP":0.85182,"HKD":8.2153,"HRK":7.5318,"HUF":309.33,"IDR":14317.74,"ILS":4.1047,"INR":72.5925,"JPY":119.73,"KRW":1247.03,"MXN":21.8727,"MYR":4.7203,"NOK":9.069,"NZD":1.504,"PHP":52.801,"PLN":4.419,"RON":4.514,"RUB":68.4111,"SEK":9.784,"SGD":1.5132,"THB":37.76,"TRY":3.6523,"USD":1.0592,"ZAR":14.9718}};
fx.base = 'EUR';

app.run(['$http', '$rootScope', function($http, $rootScope) {
  $http.get("http://api.fixer.io/latest").then(function(data) {
    fx.rates = data.data.rates
    fx.base = data.data.base
    $rootScope.$broadcast('fx.loaded');
  });

  $rootScope.settings = {
    currency: 'SEK',
    intake: '2000'
  }
}]);

app.controller('ProductsCtrl', ['$scope', 'Products', function($scope, Products) {
  var self = this;
  self.data = {};
  self.raw = [];
  Products.then(function(d) {
    // Transpose rows
    data = {};
    self.names = [];
    self.raw = d.data;

    for(var i = 0; i < d.data.length; i++) {
      var row = d.data[i];
      for(var key in row) {
        if (key === 'product-name') {
          self.names.push(row[key]);
        } else {
          data[key] = data[key] || [];
          data[key].push(row[key])
        }
      }
    }

    self.data = data;
  })

  self.pricePerDay = function(prod, key) {
    var price = prod[key];
    var value = parseFloat(price.substr(1), 5);
    var calories = parseInt(prod['product-kcal_per_port'], 10);
    var calPerDay = parseInt($scope.settings.intake, 10)
    var currency = price[0];
    var newPrice = (calPerDay / calories) * value;

    return [currency, newPrice].join('');
  };

  self.rows = function(type) {
    var returned = {};
    for (var key in self.data) {
      if (key.startsWith(type)) {
        returned[key] = self.data[key];
      }
    }
    return returned;
  }

  self.propertyRows = [
  ];

  self.divide = function(key) {
    shouldDivide = false;
    switch (key) {
      case 'nutr-kcal':
      case 'prop-gmo_free':
      case 'company':
        shouldDivide = true;
        break;
    }
    return shouldDivide;
  }

  self.indent = function(str) {
    var parts = str.split('-');
    return parts.length - 2;
  };
}]);

app.directive('currency', function() {

  var lookup = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP'
  }

  var update = function(orig, currency, el) {
    if (!el) return;
    var toCurrency = currency || 'USD';
    var fromCurrency = lookup[orig[0]] || 'USD';
    var value = parseFloat(orig.substr(1), 2);
    var converted = orig;
    try {
       converted = fx(value).from(fromCurrency).to(toCurrency).toFixed(2);
    } catch(e) {}
    el.text(toCurrency + ' ' + converted);
  }

  return {
    restrict: 'A',
    link: function(scope, el, attrs) {
      var _update = function() {
        var orig = scope.$eval(attrs.currency);
        if (!orig) {
          return;
        }
        update(orig, scope.settings.currency, el);
      };
      scope.$on('fx.loaded', _update);
      scope.$watch('settings.currency', _update);
      scope.$watch(attrs.currency, _update);

      _update();
    }
  }
})

app.filter('titleize', function() {
  return function(str) {
    var parts = str.split('-');
    return parts[parts.length-1].replace(/_/g, ' ');
  };
});
