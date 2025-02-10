// Set up the colorpicker
var colorPicker = new iro.ColorPicker("#colorPicker", {
    width: document.querySelector('#colorPicker').clientWidth,
    color: "#ff0",
    borderWidth: 1,
    wheelLightness: false,
    layout: [
        {
            component: iro.ui.Wheel,
            options: {},
        },
        {
            component: iro.ui.Slider,
            options: {
                sliderType: 'hue',
            },
        },
        {
            component: iro.ui.Slider,
            options: {
                sliderType: 'saturation',
            },
        },
        {
            component: iro.ui.Slider,
            options: {
                sliderType: 'value',
            }
        },
        {
            component: iro.ui.Slider,
            options: {
                sliderType: 'alpha',
            }
        },
    ]
});
var globalBrightnessPicker = new iro.ColorPicker("#globalBrightnessPicker", {
    width: document.querySelector('#globalBrightnessPicker').clientWidth,
    color: "#fff",
    borderWidth: 1,
    layout: [
        {
            component: iro.ui.Slider,
            options: {
                sliderType: 'value',
            }
        },
    ]
});

function mulberry32(a) {
    return function () {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}


// Create a total of 1120 light divs and distribute them evenly along the 
// lightpath svg path.
let lightColors = [];
let totalLights = 1120; //1120;
let noiseFilterCount = 10;
let lightDivs = [];
let globalBrightness = 1;
let body = document.querySelector('body');
let plan = document.querySelector('#plan');
let lights = document.querySelector('#lights');
let lightpath = document.querySelector('#lightpath>#lightpath0>path');

function clearLights() {
    for (let i = 0; i < lightDivs.length; i++) {
        lightDivs[i].remove();
    }
    lightDivs = [];
    lightCoords = [];
}

function distributeLights() {
    let lightpathLength = lightpath.getTotalLength();
    let lightSpacing = lightpathLength / totalLights;
    let lightSizeFactor = lightpath.getBoundingClientRect().width / 60;
    let seededRand = mulberry32(totalLights);
    let seededRandForNoise = mulberry32(totalLights);
    for (let i = 0; i < totalLights; i++) {
        if (lightColors.length <= i) {
            lightColors[i] = { r: 255, g: 0, b: 0, a: 1 };
        }
        let lightpathPoint = lightpath.getPointAtLength(i * lightSpacing);
        let documentPoint = lightpathPoint.matrixTransform(lightpath.getCTM());
        let lightDiv = document.createElement('div');
        lightDiv.classList.add('light');
        lightDiv.dataset.centerX = documentPoint.x;
        lightDiv.dataset.centerY = documentPoint.y;
        lightDiv.dataset.index = i;
        lightDiv.style.left = documentPoint.x + 'px';
        lightDiv.style.top = documentPoint.y + 'px';
        lightDiv.style.background = "rgba(255, 255, 255, 0.0)";
        lightDiv.style.width = (seededRand() + 5) * lightSizeFactor + 'px';
        lightDiv.style.height = (seededRand() + 5) * lightSizeFactor + 'px';
        lightDiv.style.zIndex = 500 + seededRand() % 300;

        /*var noiseIndex = i % noiseFilterCount;
        var noise = document.querySelector('#noiseFilter' + noiseIndex);
        if(noise === null) {
            noise = document.querySelector('#noiseFilter').cloneNode(true);
            noise.id = 'noiseFilter' + noiseIndex;
            noise.children[0].setAttribute('seed', Math.floor(seededRandForNoise() * 1000000));
            body.appendChild(noise);
        }
        lightDiv.style.filter = 'url(#noiseFilter' + i + ')';*/

        lightDivs[i] = lightDiv;
        lights.appendChild(lightDiv);
    }
}

function updateLight(index) {
    if (index !== undefined) {
        let lightDiv = lightDivs[index];
        let color = lightColors[index];
        lightDiv.style.background = "radial-gradient(circle, rgba(" + color.r + ", " + color.g + ", " + color.b + ", " + color.a + "), "
            + "rgba(0, 0, 0, 0.0) 100%)";
    } else {
        for (let i = 0; i < lightDivs.length; i++) {
            updateLight(i);
        }
    }
}

function setupLightTouchEvents() {
    plan.addEventListener('touchmove', function (event) {
        let touches = event.touches;
        var indexStart = totalLights;
        var indexEnd = -1;
        for (let i = 0; i < touches.length; i++) {
            let touch = touches[i];
            let touchX = touch.clientX - plan.getBoundingClientRect().left;
            let touchY = touch.clientY - plan.getBoundingClientRect().top;
            let elementsAtTouch = document.elementsFromPoint(touch.clientX, touch.clientY);
            for (let j = 0; j < elementsAtTouch.length; j++) {
                let element = elementsAtTouch[j];
                if (element.dataset.index !== undefined) {
                    if (element.dataset.centerX - touchX < 10 && element.dataset.centerY - touchY < 10) {
                        let color = colorPicker.color.rgba;
                        lightColors[element.dataset.index] = color;
                        updateLight(element.dataset.index);
                        indexStart = Math.min(indexStart, element.dataset.index);
                        indexEnd = Math.max(indexEnd, element.dataset.index);
                    }
                }
            }
        }
        if (indexEnd >= 0) {
            sendColors(indexStart, indexEnd);
        }
    });
}


// WLED communication
// ---------------------------------------------------------------------------

//let wledSegments = [{index: 0, start: 0, count: 560}, {index: 0, start: 560, count: 560}];
let wledSegments = [{ index: 0, start: 0, count: 140 }];
let wledHost = "wled2.fritz.box";
let wledPort = 80;
let wledRequestQueue = [];
let wledRequestInFlight = null;

function sendWledRequest(jsonRequest) {
    let xhrFunc = function () {
        fetch('http://' + wledHost + ":" + wledPort + '/json/state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: jsonRequest,
        }).then(response => {
            wledRequestInFlight = null;
            sendRequestQueue();
        }).catch(error => {
            wledRequestInFlight = null;
        });
    }
    wledRequestQueue.push(xhrFunc);
}

function sendGlobalBrightness() {
    let newBrightness = Math.round(globalBrightness * 255);
    sendWledRequest(JSON.stringify({ bri: newBrightness }));
}

function sendColors(startIndex, endIndex) {
    var blocks = [];
    var block = null;
    if (startIndex !== undefined) {
        for (let i = startIndex; i < endIndex; i++) {
            let color = lightColors[i];
            if (block === null) {
                block = { seg: { "i": [] } };
                block.seg.i = [i];
            }
            block.seg.i.push(color.r.toString(16).toUpperCase().padStart(2, '0') + color.g.toString(16).toUpperCase().padStart(2, '0') + color.b.toString(16).toUpperCase().padStart(2, '0'));
            if (block.seg.i.length >= 256) {
                blocks.push(block);
                block = null;
            }
        }
        if (block !== null) {
            blocks.push(block);
        }
    } else {
        var currentSegment = -1;
        for (let i = 0; i < wledSegments.length; i++) {
            let segment = wledSegments[i];
            for (let j = 0; j < segment.count; j++) {
                let color = lightColors[segment.start + j];

                if (currentSegment != i) {
                    if (block !== null) {
                        blocks.push(block);
                    }
                    block = { seg: { "i": [] } };
                    currentSegment = i;
                    block.seg.i = [j];
                }
                if (block.seg.i.length >= 256) {
                    blocks.push(block);
                    block = { seg: { "i": [] } };
                    block.seg.i = [j];
                }

                block.seg.i.push(color.r.toString(16).toUpperCase().padStart(2, '0') + color.g.toString(16).toUpperCase().padStart(2, '0') + color.b.toString(16).toUpperCase().padStart(2, '0'));
            }
            blocks.push(block);
            block = null;
        }
        if (block !== null) {
            blocks.push(block);
        }
    }
    for (let i = 0; i < blocks.length; i++) {
        let block = blocks[i];
        sendWledRequest(JSON.stringify(block));
    }
}

function sendRequestQueue() {
    if (wledRequestInFlight !== null) {
        return;
    }

    if (wledRequestQueue.length > 0) {
        let xhrFunc = wledRequestQueue.shift();
        wledRequestInFlight = xhrFunc;
        xhrFunc();
    }
}
setInterval(sendRequestQueue, 100);


// Set up everything
// ---------------------------------------------------------------------------

distributeLights();
updateLight();
setupLightTouchEvents();
addEventListener('resize', function () {
    clearLights();
    distributeLights();
    updateLight();
});
globalBrightnessPicker.on(['color:init', 'color:change'], function (color) {
    globalBrightness = color.value / 100;
    //lights.style.opacity = 1 - Math.pow(1 - globalBrightness, 3);;
    sendGlobalBrightness();
});

sendColors();