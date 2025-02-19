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
    color: "#555",
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
const lightColors = [];
const totalLights = 1120; //1120;
const noiseFilterCount = 10;
const lightDivs = [];
let globalBrightness = 0.3;
const body = document.querySelector('body');
const plan = document.querySelector('#plan');
const lights = document.querySelector('#lights');
const lightpath = document.querySelector('#lightpath>#lightpath0>path');

function clearLights() {
    for (let i = 0; i < lightDivs.length; i++) {
        lightDivs[i].remove();
    }
    lightDivs.length = 0;
    lightCoords.length = 0;
}

function distributeLights() {
    const lightpathLength = lightpath.getTotalLength();
    const lightSpacing = lightpathLength / totalLights;
    const lightSizeFactor = lightpath.getBoundingClientRect().width / 60;
    const seededRand = mulberry32(totalLights);
    // const seededRandForNoise = mulberry32(totalLights);
    for (let i = 0; i < totalLights; i++) {
        if (lightColors.length <= i) {
            lightColors[i] = { r: 255, g: 0, b: 0, a: 1 };
        }
        const lightpathPoint = lightpath.getPointAtLength(i * lightSpacing);
        const documentPoint = lightpathPoint.matrixTransform(lightpath.getCTM());
        const lightDiv = document.createElement('div');
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
    }
    lights.append(...lightDivs);
}

function updateLight(index) {
    if (index !== undefined) {
        const lightDiv = lightDivs[index];
        const color = lightColors[index];
        //lightDiv.style.background = "radial-gradient(circle, rgba(" + color.r + ", " + color.g + ", " + color.b + ", " + color.a + "), "
        //    + "rgba(0, 0, 0, 0.0) 100%)";
        lightDiv.style.background = "rgba(" + color.r + ", " + color.g + ", " + color.b + ", " + color.a + ")";
    } else {
        for (let i = 0; i < lightDivs.length; i++) {
            updateLight(i);
        }
    }
}

const alreadyProcessedElementsPerTouch = {};
let lastTouch = null;

function setupLightTouchEvents() {
    plan.addEventListener('touchmove', function (event) {
        event.preventDefault();
        event.stopPropagation();
        const touches = event.touches;
        var indexStart = totalLights;
        var indexEnd = -1;
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (alreadyProcessedElementsPerTouch[touch.identifier] === undefined) {
                alreadyProcessedElementsPerTouch[touch.identifier] = {};
            }
            const touchX = touch.clientX - plan.getBoundingClientRect().left;
            const touchY = touch.clientY - plan.getBoundingClientRect().top;
            for (let j = 0; j < lightDivs.length; j++) {
                const lightDiv = lightDivs[j];
                const centerX = lightDiv.dataset.centerX;
                const centerY = lightDiv.dataset.centerY;
                if (Math.abs(lightDiv.dataset.centerX - touchX) < 20 && Math.abs(lightDiv.dataset.centerY - touchY) < 20) {
                    const index = lightDiv.dataset.index;
                    if (alreadyProcessedElementsPerTouch[touch.identifier][index] === undefined) {
                        alreadyProcessedElementsPerTouch[touch.identifier][index] = true;
                        lightColors[index] = blendColors(lightColors[index], colorPicker.color.rgba);
                        updateLight(index);
                        indexStart = Math.min(indexStart, index);
                        indexEnd = Math.max(indexEnd, index);
                    }
                }
            }
            document.querySelector('#globals').innerHTML = touchX + " " + touchY;
        }
        if (indexEnd >= 0) {
            sendColors(indexStart, indexEnd);
        }
    });
    plan.addEventListener('touchend', function (event) {
        for (let i = 0; i < event.changedTouches.length; i++) {
            delete alreadyProcessedElementsPerTouch[event.changedTouches[i].identifier];
        }
        lastTouch = null;
    });
}

function blendColors(currentColor, newColor) {
    const opacity = newColor.a; // Extract alpha value
    return {
        r: Math.round(newColor.r * opacity + currentColor.r * (1 - opacity)),
        g: Math.round(newColor.g * opacity + currentColor.g * (1 - opacity)),
        b: Math.round(newColor.b * opacity + currentColor.b * (1 - opacity)),
        a: 1.0
    };
}

function fillCurrentColor() {
    for (let i = 0; i < lightColors.length; i++) {
        lightColors[i] = blendColors(lightColors[i], colorPicker.color.rgba);
    }
    updateLight();
    sendColors();
}


// WLED communication
// ---------------------------------------------------------------------------

const wledSegments = [{index: 0, start: 0, count: 560}, {index: 1, start: 560, count: 560}];
//const wledSegments = [{ index: 0, start: 0, count: 140 }];
const wledHost = "wled2.fritz.box";
const wledPort = 80;
const wledRequestQueue = [];
let wledRequestInFlight = null;

function sendGlobalBrightness() {
    const newBrightness = Math.round(globalBrightness * 255);
    sendWledRequest(JSON.stringify({ bri: newBrightness }));
}

function sendColors(startIndex, endIndex) {
    var blocks = [];
    var block = null;
    if (startIndex === undefined) {
        startIndex = 0;
    }
    if (endIndex === undefined) {
        endIndex = lightColors.length;
    }

    var currentSegment = -1;
    for (let i = 0; i < wledSegments.length; i++) {
        const segment = wledSegments[i];
        for (let j = 0; j < segment.count; j++) {
            const index = segment.start + j
            if (index < startIndex || index > endIndex) {
                continue;
            }

            const color = lightColors[index];
            if (currentSegment != i) {
                if (block !== null) {
                    blocks.push(block);
                }
                block = { seg: { "id": i, "i": [] } };
                currentSegment = i;
                block.seg.i = [j];
            }
            if (block.seg.i.length >= 256) {
                blocks.push(block);
                block = { seg: { "id": i, "i": [] } };
                block.seg.i = [j];
            }

            block.seg.i.push(color.r.toString(16).toUpperCase().padStart(2, '0') + color.g.toString(16).toUpperCase().padStart(2, '0') + color.b.toString(16).toUpperCase().padStart(2, '0'));
        }
        blocks.push(block);
        block = null;
    }
    if (block) {
        blocks.push(block);
    }

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block && block.seg.i.length > 1) {
            sendWledRequest(JSON.stringify(block));
        }
    }
}



function sendWledRequest(jsonRequest) {
    const xhrFunc = function () {
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
            sendRequestQueue();
        });
    }

    wledRequestQueue.push(xhrFunc);
    //console.info("Sending request: " + jsonRequest);
}

function sendRequestQueue() {
    if (wledRequestInFlight !== null) {
        return;
    }

    if (wledRequestQueue.length > 0) {
        const xhrFunc = wledRequestQueue.shift();
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