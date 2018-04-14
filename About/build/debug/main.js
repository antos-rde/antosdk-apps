(function() {
  var About;

  About = class About extends this.OS.GUI.BaseApplication {
    constructor(args) {
      super("About", args);
    }

    main() {
      var me;
      me = this;
      this.container = this.find("container");
      return "os://README.md".asFileHandler().read(function(txt) {
        var converter;
        converter = new showdown.Converter();
        return ($(me.container)).html(converter.makeHtml(txt));
      });
    }

  };

  About.singleton = true;

  About.dependencies = ["showdown.min"];

  this.OS.register("About", About);

}).call(this);
