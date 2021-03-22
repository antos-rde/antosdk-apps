

class SystemControl extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "SystemControl", args
    
    main: () ->
        @max_net_range = 2048
        @diskchart =  $(@find("disk-area")).epoch({
            type: 'time.gauge',
            value: 0
        });
        @on "resize", () =>
            el = @find("cpu-area")
            if @cpu
                $(el).children().hide()
                @cpu.option("width", $(el).width())
                @cpu.option("height", $(el).height())
                $(el).children().show()
            el = @find("battery-area")
            
            el = @find("memory-area")
            if @memory
                $(el).children().hide()
                @memory.option("width", $(el).width())
                @memory.option("height", $(el).height())
                $(el).children().show()
            
            el = @find("network-area")
            if @network
                $(el).children().hide()
                @network.option("width", $(el).width())
                @network.option("height", $(el).height())
                $(el).children().show()
                
            el = @find("temp-area")
            if @temp
                $(el).children().hide()
                @temp.option("width", $(el).width())
                @temp.option("height", $(el).height())
                $(el).children().show()
            
            el = @find("battery-area")
            if @battery
                $(el).children().hide()
                @battery.option("width", $(el).width())
                @battery.option("height", $(el).height())
                $(el).children().show()
                
        @_gui.pushService("SystemControl/SysmondService", [])
            .then (p) =>
                @service = p
                p.app = @
            .catch (e) =>
                @error __("Unable to start sysmond service"), e
    
    streamline: (name, data, range, labels) ->
        i = 0
        legend = $(@find("#{name}-text"))
        if not @[name]
            options = {
                type: 'time.line',
                axes: ['bottom', 'left', "right"]
            }
            options.range = range if range
            dobj = []
            for item in data
                dobj.push { label: "label-#{i}", values: [] }
                $("<div>")
                    .addClass('legend-color')
                    .addClass('ref')
                    .addClass('category' + (i+1))
                    .appendTo(legend)
                $("<div>")
                    .addClass('legend-label')
                    .appendTo(legend)
                    .text(if labels then labels[i] else "#{name}-#{i}")
                $("<div>")
                    .addClass('legend-value')
                    .appendTo(legend)
                i = i + 1
            options.data =dobj
            @[name] = $(@find("#{name}-area")).epoch(options)
            
        for item in data
            $(legend.children()[i*3 + 2]).text( item.y.toString() )
            i = i + 1
        @[name].push data
    
    feed: (data) ->
        #mem_percent = parseFloat(data.mem.match(/([0-9\.]+)%/)[1])
        #@memchart.push mem_percent / 100.0
        #@find("mem-text").text = data.mem
        
        disk_used = data.disk_total - data.disk_free
        @diskchart.push(disk_used / data.disk_total)
        @find("disk-text").text = "Disk: " + (Math.round(disk_used / 1024 / 1024 / 1024)) + "/" + (Math.round(data.disk_total / 1024 / 1024 / 1024)) + " GB"
        
        now = data.stamp_sec
        
        data.cpu_usages.shift()
        cpu_data = ({ time: now, y: v.toFixed(2) } for v in data.cpu_usages)
        @streamline "cpu", cpu_data, [0, 100]
        
        total_mem = data.mem_total / 1024.0 / 1024.0
        used_mem = data.mem_used / 1024.0 / 1024.0
        total_swap = data.mem_swap_total / 1024.0 / 1024.0
        used_swap = (data.mem_swap_total - data.mem_swap_free) / 1024.0 / 1024.0
        mem_data = [
            { time: now, y: used_mem.toFixed(3)},
            { time: now, y: used_swap.toFixed(3)}
        ]
        mem_range = [0, if total_mem > total_swap then total_mem else total_swap]
        @streamline "memory", mem_data, mem_range, ["RAM (GB)", "SWAP (GB)"]
        
        net_rx = 0
        net_tx = 0
        
        net_rx = net_rx + v.rx_rate for v in data.net
        net_tx = net_tx + v.tx_rate for v in data.net
        net_data = [
            { time: now, y: (net_rx / 1024.0).toFixed(3)},
            { time: now, y: (net_tx / 1024.0).toFixed(3)}
        ]
        @max_net_range = net_data[0].y if net_data[0].y > @max_net_range
        @max_net_range = net_data[1].y if net_data[1].y > @max_net_range
        @streamline "network", net_data, [0, @max_net_range], ["RX (Kb/s)", "TX (Kb/s)"]
    
        
        temp_data = [
            { time: now, y: (data.cpu_temp / 1000.0).toFixed(2)},
            { time: now, y: (data.gpu_temp / 1000.0).toFixed(2)}
        ]
        @streamline "temp", temp_data, [0,], ["CPU temp (C)", "GPU temp (C)"]
        
        battery_range = [
            (data.battery_min_voltage / 1000.0).toFixed(2), 
            (data.battery_max_voltage / 1000.0).toFixed(2)]
        @streamline "battery", [ { time: now, y: (data.battery/ 1000.0).toFixed(2)} ], battery_range, ["Baterry (v)"]
    cleanup: () ->
        return unless @service
        @service.app = undefined
        @service = undefined

SystemControl.singleton = true
SystemControl.dependencies = [
    "pkg://Antunnel/main.js"
]
this.OS.register "SystemControl", SystemControl