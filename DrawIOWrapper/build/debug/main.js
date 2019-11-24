(function() {
  var DrawIOWrapper;

  DrawIOWrapper = class DrawIOWrapper extends this.OS.GUI.BaseApplication {
    constructor(args) {
      super("DrawIOWrapper", args);
    }

    main() {}

  };

  this.OS.register("DrawIOWrapper", DrawIOWrapper);

}).call(this);
