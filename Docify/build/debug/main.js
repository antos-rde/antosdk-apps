(function() {
  var Docify;

  Docify = class Docify extends this.OS.application.BaseApplication {
    constructor(args) {
      super("Docify", args);
    }

    main() {}

  };

  this.OS.register("Docify", Docify);

}).call(this);
