(function() {
  void 0;
  var About;

  About = class About extends this.OS.GUI.BaseApplication {
    constructor(args) {
      super("About", args);
    }

    main() {
      var me, path;
      me = this;
      this.container = this.find("container");
      path = "os://README.md";
      path.asFileHandle().read().then(function(txt) {
        var converter;
        converter = new showdown.Converter();
        return ($(me.container)).html(converter.makeHtml(txt));
      }).catch(() => {
        return this.notify(__("Unable to read: {0}", path));
      });
      return this.find("btnclose").set("onbtclick", () => {
        return this.quit();
      });
    }

  };

  About.singleton = true;

  About.dependencies = ["os://scripts/showdown.min.js"];

  this.OS.register("About", About);

}).call(this);
