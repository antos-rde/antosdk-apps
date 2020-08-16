

class JarvisControl extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "JarvisControl", args
    
    main: () ->
        @batterychart = $(@find("battery-area")).epoch({
            type: 'time.line',
            axes: ['bottom', 'left', "right"],
            range: [2500, 4300]
            data: [{
                label: "Battery",
                values: []
            }]
          })
        @tempchart = $(@find("temp-area")).epoch({
            type: 'time.line',
            axes: ['bottom', 'left', "right"],
            range: [0, 100],
            data: [{
                label: "Temperature",
                values: []
            }]
          })
        @memchart = $(@find("mem-area")).epoch({
            type: 'time.gauge',
            value: 0
          })
        @diskchart = $(@find("disk-area")).epoch({
            type: 'time.gauge',
            value: 0
          })
        @cpuchart = $(@find("cpu-area")).epoch({
            type: 'time.gauge',
            value: 0
          })
        checklib = () =>
            if not Antunnel.tunnel
                @error __("The Antunnel service is not started, please start it first")
                .catch (e) =>
                    @error e.toString(), e
                @quit()
            else
                @tunnel = Antunnel.tunnel
                @sub = new Antunnel.Subscriber("notification")
                @sub.onopen = () =>
                    #@sub.send Antunnel.Msg.DATA, new TextEncoder("utf-8").encode("Hello")
                    console.log("Subscribed to notification channel")
                    @_gui.pushService("JarvisControl/JarvisService")
                
                @sub.onerror = (e) =>
                    @error __("Error: {0}", new TextDecoder("utf-8").decode(e.data)), e
                    #@sub = undefined
        
                @sub.onmessage =  (e) =>
                    obj = JSON.parse(new TextDecoder("utf-8").decode(e.data)) if e.data
                    # update the battery
                    @display obj
                
                @sub.onclose = () =>
                    @sub = undefined
                    @notify __("Unsubscribed to the notification service")
                    @quit()
                Antunnel.tunnel.subscribe @sub
        @on "resize", () =>
            el = @find("battery-area")
            @batterychart.option("width", $(el).width())
            @batterychart.option("height", $(el).height())
            el = @find("temp-area")
            @tempchart.option("width", $(el).width())
            @tempchart.option("height", $(el).height())
        checklib()
        
    display: (data) ->
        mem_percent = parseFloat(data.mem.match(/([0-9\.]+)%/)[1])
        @memchart.push mem_percent / 100.0
        @find("mem-text").text = data.mem
        
        disk_percent = parseFloat(data.disk.match(/([0-9\.]+)%/)[1])
        @diskchart.push disk_percent / 100.0
        @find("disk-text").text = data.disk
        
        cpu_percent = parseFloat(data.cpu.match(/([0-9\.]+)$/)[1])
        @cpuchart.push cpu_percent / 100.0
        @find("cpu-text").text = data.cpu
        
        @batterychart.push [{time: (new Date()).timestamp(), y: data.battery}]
        @find("bat-text").text = __("Battery Usage: {0} mv ({1}%)", data.battery, Math.round(data.battery_percent))
        
        @tempchart.push [{time: (new Date()).timestamp(), y: data.temp}]
        @find("temp-text").text = __("CPU temperature: {0} C", data.temp)
    cleanup: () ->
        return unless @sub
        @sub.close()

JarvisControl.singleton = true

this.OS.register "JarvisControl", JarvisControl