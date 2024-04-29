(function() {
    // import the CodePad application module
    const App = this.OS.application.Antedit;
    
    // define the extension
    App.extensions.{0} = class {0} extends App.EditorBaseExtension {
        constructor(app) {
          super("{0}",app);
        }
        
        test() {
          return this.notify("Test action is invoked");
        }
        
        cleanup() {}
    
    };

}).call(this);