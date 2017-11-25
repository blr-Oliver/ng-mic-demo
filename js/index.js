angular.module('mic-connect', ['raf', 'moving-average']).factory('microphone', ['$window', function($window){
  var context = new AudioContext();
  var filter = context.createBiquadFilter();
  var useFilter = false;
  filter.type = 'lowpass';
  filter.frequency.value = 60;
  filter.gain.value = +10;
  filter.Q.value = 10;

  var analyzer = context.createAnalyser();
  analyzer.fftSize = 32;
  analyzer.smoothingTimeConstant = 0.7;

  filter.connect(analyzer);

  var byteBuffer = new Uint8Array(analyzer.frequencyBinCount);
  var floatBuffer = new Float32Array(analyzer.frequencyBinCount);

  navigator.mediaDevices.getUserMedia({
    audio: true
  }).then(function(stream){
    var source = context.createMediaStreamSource(stream);
    if(useFilter){
      source.connect(filter);
      filter.connect(analyzer);
    }else{
      source.connect(analyzer);
    }

  })['catch'](function(err){
    console.log(err);
  });

  function copy(from, to){
    to = to || [];
    for (var i = to.length = from.length; i--;)
      to[i] = from[i];
    return to;
  }

  return {
    getData: function(target){
      analyzer.getByteFrequencyData(byteBuffer);
      return copy(byteBuffer, target);
    },
    getRawData: function(target){
      analyzer.getFloatFrequencyData(floatBuffer)
      return copy(floatBuffer, target);
    },
    adjust: function(minDecibels, maxDecibels){
      analyzer.minDecibels = minDecibels;
      analyzer.maxDecibels = maxDecibels;
    }
  }
}]).controller('MicrophoneCtrl',
    ['$scope', 'microphone', 'raf', 'MovingAverage', '$q', function($scope, microphone, raf, MovingAverage, $q){
      $scope.minDecibels = -140;
      $scope.maxDecibels = 0;
      $scope.silence = -90;
      $scope.sensitivity = 60;
      $scope.dampening = 0.5;
      $scope.average = new MovingAverage(30, noiseEquivalent);

      $scope.$watchGroup(['minDecibels', 'maxDecibels'], function(newValues){
        if(newValues[0] < newValues[1])
          microphone.adjust.apply(microphone, newValues);
      });

      $scope.$watchGroup(['silence', 'sensitivity'], function(newValues){
        $scope.low = normalizeLevel(newValues[0] + newValues[1] / 4 - 5);
        $scope.high = normalizeLevel(newValues[0] + newValues[1]);
      });

      $scope.$watch('dampening', function(newValue){
        $scope.average.size = newValue * 60 || 1;
      });

      $scope.calibrate = function(){
        $scope.calibrating = true;
        $scope.calibratingFrames = 500;
        $scope.calibratingFramesDone = 0;
        $scope.minLevel = $scope.maxLevel = $scope.level;
        var task = $scope.calibrationTask = $q.defer();
        task.promise.then(function(values){
          console.log(arguments);
          $scope.silence = values[0] + (values[1] - values[0]) / 4;
          $scope.calibrationTask = null;
          $scope.calibrating = false;
        });
      }

      function normalizeLevel(level){
        return Math.max(0, Math.min(1, (level - $scope.minDecibels) / ($scope.maxDecibels - $scope.minDecibels)));
      }
      
      function noiseEquivalent(data){
        var count = 0, sum = 0.0, i = data.length;
        while(i--){
          var value = data[i];
          if(typeof (value) !== 'undefined'){
            ++count;
            sum += Math.pow(10, value / 10);
          }
        }
        return Math.log10(sum / count) * 10;
      }

      raf.loop(function(){
        $scope.data = microphone.getData($scope.data);
        $scope.rawData = microphone.getRawData($scope.rawData);
        $scope.level = noiseEquivalent($scope.rawData);
        $scope.volume = normalizeLevel($scope.level);
        $scope.average.add($scope.volume);
        $scope.gauge = ($scope.average - $scope.low) / ($scope.high - $scope.low);
        $scope.gauge = Math.min(Math.max($scope.gauge, 0), 1) * 180;
        if($scope.calibrating){
          $scope.minLevel = Math.min($scope.minLevel, $scope.level);
          $scope.maxLevel = Math.max($scope.maxLevel, $scope.level);
          $scope.min = normalizeLevel($scope.minLevel);
          $scope.max = normalizeLevel($scope.maxLevel);
          if(++$scope.calibratingFramesDone >= $scope.calibratingFrames)
            $scope.calibrationTask.resolve([$scope.minLevel, $scope.maxLevel]);
        }
      });
    }]);