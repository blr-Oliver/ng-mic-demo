angular.module('raf', []).factory('raf', ['$window', '$rootScope', function($window, $rootScope){
  var $$raf = $window.requestAnimationFrame, $$caf = $window.cancelAnimationFrame;

  function raf(cb, $scope){
    $scope = $scope || $rootScope;
    var id = $$raf(cb && function(){
      $scope.$apply(() => cb.apply(this, arguments));
    });
    return function(){
      $$caf(id);
    }
  }

  raf.loop = function(cb, $scope){
    $scope = $scope || $rootScope;
    var id = $$raf(cb && function frame(){
      $scope.$apply(() => cb.apply(this, arguments));
      id = $$raf(frame);
    });

    return function(){
      $$caf(id);
    }
  }

  return raf;
}]);