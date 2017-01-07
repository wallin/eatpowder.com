if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position){
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
  };
}

var app = angular.module('ep', ['angularjs-dropdown-multiselect']);

app.factory('Products', ['$http', function($http){
  var url   = "data/products.csv";
  return $http.get(url).then(function(response){
     return Papa.parse(response.data, { header: true, dynamicTyping: true });
  });
}]);

fx.rates = {"base":"EUR","date":"2016-11-25","rates":{"AUD":1.423,"BGN":1.9558,"BRL":3.6394,"CAD":1.429,"CHF":1.0736,"CNY":7.3295,"CZK":27.039,"DKK":7.438,"GBP":0.85182,"HKD":8.2153,"HRK":7.5318,"HUF":309.33,"IDR":14317.74,"ILS":4.1047,"INR":72.5925,"JPY":119.73,"KRW":1247.03,"MXN":21.8727,"MYR":4.7203,"NOK":9.069,"NZD":1.504,"PHP":52.801,"PLN":4.419,"RON":4.514,"RUB":68.4111,"SEK":9.784,"SGD":1.5132,"THB":37.76,"TRY":3.6523,"USD":1.0592,"ZAR":14.9718}};
fx.base = 'EUR';

app.run(['$http', '$rootScope', function($http, $rootScope) {
  $http.get("https://api.fixer.io/latest").then(function(data) {
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

  self.selectedProducts = [{ id: 0 }, { id: 4 }, { id: 6 }, { id: 7 }, { id: 11 }, { id: 14 }, {id: 16}]
  self.selectedData = [];
  self.allRows = [];
  self.selectedSettings = {
    buttonClasses: 'btn btn-default btn-block'
  }
  Products.then(function(d) {
    // Transpose rows
    data = {};
    self.names = [];
    self.raw = d.data;

    self.selectedData = [];
    for(var i = 0; i < d.data.length; i++) {
      var row = d.data[i];
      row.id = i // Add id based on index
      for(var key in row) {
        if (key === 'product-name') {
          self.names.push(row[key]);
        } else {
          data[key] = data[key] || [];
          data[key].push(row[key])
        }
      }
      self.selectedData.push({id: i, label: row['product-variant'], brand: row['product-name']})
    }

    for(var key in row) {
      self.allRows.push(key);
    }

    self.data = data;
  })

  self.filterSelect = function(value) {
    for (var i = self.selectedProducts.length - 1; i >= 0; i--) {
      if (self.selectedProducts[i].id == value.id) {
        return true
      }
    }
    return false;
  }

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
    var returned = [];
    for (var i = 0; i < self.allRows.length; i++) {
      var row = self.allRows[i]
      if (row.startsWith(type)) {
        returned.push(row)
      }
    }
    return returned;
  }

  self.selected = function (col) {
    var selected = [];
    for (var i = self.raw.length - 1; i >= 0; i--) {
      if (self.filterSelect(self.raw[i])) {
        var val = self.raw[i];
        if(col) {
          val = self.raw[i][col]
        }
        selected.push(val)
      }
    }
    return selected;
  }

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

  self.propertyClass = function(val) {
    if (val === 'Yes') {
      return 'glyphicon-ok'
    } else if(val === "No") {
      return 'glyphicon-remove'
    } else {
      return ''
    }
  }
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
