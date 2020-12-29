let resolution;

decode_jpeg = (raw, msg) =>
{
    if(!JpegImage)
    {
        console.error("The JPEG library is not available");
        return 0;
    }
    let jpeg = new JpegImage()
    jpeg.parse(raw)
    if(jpeg.width != msg.w || jpeg.height != msg.h)
    {
        console.error("Incorrect data size: expect " + msg.w*msg.h*4 + " got " + jpeg.width*jpeg.height*4);
        return 0;
    }
    msg.pixels = new Uint8Array(msg.w*msg.h*4);
    let data = jpeg.getData(msg.w, msg.h);
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
    return msg.pixels.length;
}

decode_raw = (raw, msg) =>
{
    let size =raw.length;
    if(resolution.depth == 32)
    {
        msg.pixels = new Uint8Array(raw);
        return size;
    }
    if(resolution.depth != 16)
    {
        console.error("Unsupported depth" + resolution.depth);
        return 0;
    }
    let bytes = resolution.depth/8;
    let npixels = size / bytes;
    let outsize = npixels*4;
    if(outsize != msg.w*msg.h*4)
    {
        console.error("Incorrect data size: expect " + msg.w*msg.h*4 + " got " + outsize);
        return 0;
    }
    msg.pixels = new Uint8Array(outsize);
    let value = 0;
    let px = {};
    for(let i = 0; i < npixels; i++)
    {
        value = 0;
        for(let j=0; j < bytes; j++ )
            value = (raw[i * bytes + j] << (j*8)) | value ;
            // lookup for pixel
        msg.pixels[i*4] = (value & 0x1F) * (255 / 31);
        msg.pixels[i*4+1] = ((value >> 5) & 0x3F) * (255 / 63);
        msg.pixels[i*4+2] = ((value >> 11) & 0x1F) * (255 / 31);
        msg.pixels[i*4+3] = 255;
    }
    return outsize;
}

decode = (arr) =>
{
    let datain = new Uint8Array(arr);
    let msg = {
        x: datain[1] | (datain[2] << 8),
        y: datain[3] | (datain[4] << 8),
        w: datain[5] | (datain[6] << 8),
        h: datain[7] | (datain[8] << 8),
        flag: datain[9],
        pixels: undefined
    }
    switch (msg.flag) {
        case 0x0:
            decode_raw(datain.subarray(10), msg);
            break;
        case 0x1:
            decode_jpeg(datain.subarray(10), msg);
            break;
        default:
            console.error("Unknow flag: " + msg.flag);
    }
    if(msg.pixels)
    {
        msg.pixels = msg.pixels.buffer;
        postMessage(msg, [msg.pixels]);
    }
}

onmessage = (e) => {
    if(e.data.depth)
    {
        resolution = e.data;
    }
    else if(e.data.libjpeg)
    {
        importScripts(e.data.libjpeg);
    }
    else
    {
        decode(e.data);
    }
}