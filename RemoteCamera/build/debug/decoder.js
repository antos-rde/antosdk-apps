decode = (arr) =>
{
    if(!JpegImage)
    {
        console.error("libjpeg is not available");
        return;
    }
    let raw = new Uint8Array(arr);
    let jpeg = new JpegImage();
    jpeg.parse(raw);
    let data = jpeg.getData(jpeg.width, jpeg.height);
    let msg = {
        w: jpeg.width,
        h: jpeg.height,
        pixels: undefined
    }
    msg.pixels = new Uint8Array(msg.w*msg.h*4);
    for(let j = 0; j < msg.h; j++)
    {
        for(let i = 0; i < msg.w; i++)
        {
            let index = j*msg.w*4 + i*4;
            msg.pixels[index] = data[j*msg.w*3 + i*3];
            msg.pixels[index+1] = data[j*msg.w*3 + i*3 + 1];
            msg.pixels[index+2] = data[j*msg.w*3 + i*3 + 2];
            msg.pixels[index+3] = 255;
        }
    }
    msg.pixels = msg.pixels.buffer;
    postMessage(msg, [msg.pixels]);
}

onmessage = (e) => {
    switch (e.data.cmd) {
        case 0x0:
            importScripts(e.data.data);
            break;
        case 0x1:
            decode(e.data.data);
            break;
        default:
            console.error("Unknown command " + e.data.cmd);
    }
}