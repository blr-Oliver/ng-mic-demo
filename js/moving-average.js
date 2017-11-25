angular.module('moving-average', []).factory('MovingAverage', [function(){

  MovingAverage.prototype = {
    add: function(value){
      this.head %= this.data.length;
      this.data[this.head++] = value;
    },
    get: function(){
      return this.reducer.call(this, this.data);
    }
  };
  MovingAverage.LINEAR = function(data){
    var count = 0, sum = 0.0, i = data.length;
    while(i--){
      var value = data[i];
      if(typeof (value) !== 'undefined'){
        ++count;
        sum += value;
      }
    }
    return sum / count;
  }
  // some sugar to allow direct arithmetic operations on the object
  MovingAverage.prototype.valueOf = MovingAverage.prototype.get;

  Object.defineProperty(MovingAverage.prototype, 'size', {
    get: function(){
      return this.data.length;
    },
    set: function(value){
      if(value < 1)
        throw new Error(`MovingAverage.size: ${value}`);
      value = ~~value;
      if(value > this.data.length){
        var shift = this.data.length - this.head;
        if(shift){
          var temp = Array(this.data.length);
          arrayCopy(this.data, 0, temp, shift, this.head);
          arrayCopy(this.data, this.head, temp, 0, shift);
          arrayCopy(temp, 0, this.data, 0, this.data.length);
          this.head = this.data.length;
        }
      }else if(value < this.data.length){
        if(this.head > value){
          if(this.head >= value << 1){
            this.data.copyWithin(0, this.head - value, this.head);
            this.head = value;
          }else{
            this.data.copyWithin(0, value, this.head);
            this.head -= value;
          }
        }else if(this.head < value)
          this.data.copyWithin(this.head, this.head - value);
      }
      this.data.length = value;
    }
  });

  return MovingAverage;

  function MovingAverage(size, reducer){
    this.head = 0;
    this.data = [];
    this.size = size;
    this.reducer = reducer || MovingAverage.LINEAR;
  }

  function arrayCopy(from, fromIndex, to, toIndex, count){
    while(count--)
      to[toIndex++] = from[fromIndex++];
  }
}]);