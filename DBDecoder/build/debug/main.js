(function() {
  var DBDecoder;

  DBDecoder = class DBDecoder extends this.OS.application.BaseApplication {
    constructor(args) {
      super("DBDecoder", args);
    }

    main() {
      var bt;
      bt = this.find("decoder");
      this.db = new this._api.DB("blogs");
      return bt.onbtclick = (e) => {
        // decode the database
        return this.db.find("1=1").then((data) => {
          var i, len, v;
          for (i = 0, len = data.length; i < len; i++) {
            v = data[i];
            v.content = atob(v.content);
            v.rendered = atob(v.rendered);
          }
          return this.saveDB(data).then(() => {
            return this.notify("Data base saved");
          }).catch((e) => {
            return this.error(e.toString(), e);
          });
        });
      };
    }

    saveDB(list) {
      return new Promise((resolve, reject) => {
        var record;
        if (list.length === 0) {
          return resolve();
        }
        record = list.shift();
        return this.db.save(record).then(() => {
          return this.saveDB(list).then(() => {
            return resolve();
          }).catch((e) => {
            return reject(__e(e));
          });
        }).catch((e) => {
          return reject(__e(e));
        });
      });
    }

  };

  this.OS.register("DBDecoder", DBDecoder);

}).call(this);
