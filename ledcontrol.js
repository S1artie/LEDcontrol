// Set up the colorpicker
var colorPicker = new iro.ColorPicker("#colorpicker", {
    width: document.querySelector('#colorpicker').clientWidth,
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



// Create a total of 1120 light divs and distribute them evenly along the 
// lightpath svg path.
let lightColors = [];
let totalLights = 112;
let lightDivs = [];
let body = document.querySelector('body');

function clearLights() {
    for (let i = 0; i < lightDivs.length; i++) {
        lightDivs[i].remove();
    }
    lightDivs = [];
    lightCoords = [];
}

function distributeLights() {
    let lightpath = document.querySelector('#lightpath>#lightpath0>path');
    let plan = document.querySelector('#plan');

    let lightpathLength = lightpath.getTotalLength();
    let lightSpacing = lightpathLength / totalLights;
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

        var noise = document.querySelector('#noiseFilter' + i);
        if(noise === null) {
            noise = document.querySelector('#noiseFilter').cloneNode(true);
            noise.id = 'noiseFilter' + i;
            noise.children[0].setAttribute('seed', Math.floor(Math.random() * 1000000));
            body.appendChild(noise);
        }
        lightDiv.style.filter = 'url(#noiseFilter' + i + ')';

        lightDivs[i] = lightDiv;
        plan.appendChild(lightDiv);
    }
}

function updateLight(index) {
    if (index !== undefined) {
        let lightDiv = lightDivs[index];
        let color = lightColors[index];
        lightDiv.style.background = "radial-gradient(circle, rgba(" + color.r + ", " + color.g + ", " + color.b + ", " + color.a + "), rgba(255, 255, 255, 0.0) 100%)";
    } else {
        for (let i = 0; i < lightDivs.length; i++) {
            updateLight(i);
        }
    }
}

function setupLightTouchEvents() {
    let plan = document.querySelector('#plan');
    plan.addEventListener('touchmove', function (event) {
        let touches = event.touches;
        for (let i = 0; i < touches.length; i++) {
            let touch = touches[i];
            let touchX = touch.clientX - plan.getBoundingClientRect().left;
            let touchY = touch.clientY - plan.getBoundingClientRect().top;
            let elementsAtTouch = document.elementsFromPoint(touch.clientX, touch.clientY);
            for (let j = 0; j < elementsAtTouch.length; j++) {
                let element = elementsAtTouch[j];
                if (element.dataset.index !== undefined) {
                    if(element.dataset.centerX - touchX < 10 && element.dataset.centerY - touchY < 10) {
                        let color = colorPicker.color.rgba;
                        lightColors[element.dataset.index] = color;
                        updateLight(element.dataset.index);
                    }
                }
            }
        }
    });
}


function touchLight(lightDiv, index) {
    let color = colorPicker.color.rgba;
    lightColors[index] = color;
    updateLight();
}

distributeLights();
updateLight();
setupLightTouchEvents();
addEventListener('resize', function () {
    clearLights();
    distributeLights();
    updateLight();
});


