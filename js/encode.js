/*jslint
    bitwise: true,
    browser: true
*/

var THEYLIVE = {
    codeImage: [],
    facadeImage: [],
    keyImage: [],
    randomArray: new Int8Array(65536),
    randomIndex: Number.MAX_VALUE,
    useCustomKey: false,

    // code to check whether the code img is present or not
    hasCodeImage: function () {
        "use strict";
        return (this.codeImage.length > 0);
    },

    // code to check whether the facade img is present or not
    hasFacadeImage: function () {
        "use strict";
        return (this.facadeImage.length > 0);
    },

    // code to check whether the key img is present or not
    hasKeyImage: function () {
        "use strict";
        return (this.keyImage.length > 0);
    },

    // drag and drop functionality
    processDrop: function (event) {
        "use strict";
        var dt = event.dataTransfer;
        var files = dt.files;
        var count = files.length;
        var i;

        this.output("File Count: " + count + "\n", event.target, true);

        for (i = 0; i < files.length; i += 1) {
            this.loadimg(files[i], event.target.id);
            this.appendText(files[i].name + "\n", event.target);
        }
    },

    appendText: function (text, target) {
        "use strict";
        this.output(text, target, false);
    },

    output: function (text, target, clear) {
        "use strict";
        var newTarget = document.getElementById((target.id).replace("drop", "Data"));
        if (clear) {
            newTarget.textContent = text;
        } else {
            newTarget.textContent += text;
        }
        newTarget.textContent += "\n";
    },

    // conversion to greyscale
    onebit: function (canvas) {
        "use strict";
        var imgData = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
        var i;
        var colorVal;
        var red;
        var green;
        var blue;

        for (i = 0; i < imgData.data.length; i = i + 4) {
            if (((imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3) > 127) {
                colorVal = 255;
            } else {
                colorVal = 0;
            }
            red = i;
            green = i + 1;
            blue = i + 2;
            imgData.data[red] = colorVal;
            imgData.data[green] = colorVal;
            imgData.data[blue] = colorVal;
        }
        canvas.getContext("2d").putImageData(imgData, 0, 0);
    },

    getRandomValue: function () {
        "use strict";
        // If we have already used all the existing random
        // numbers, generate new ones
        if (this.randomIndex >= this.randomArray.length) {
            this.randomIndex = -1;
            window.crypto.getRandomValues(this.randomArray);
        }

        // Advance the array index
        this.randomIndex = this.randomIndex + 1;

        // Numbers range between -128 and 127
        if (this.randomArray[this.randomIndex] < 0) {
            return 0;
        }
        return 255;
    },

    getValue: function (minmax) {
        "use strict";
        if (this.useCustomKey) {
            return this.getRandomValue();
        }
        return minmax(0, 255);
    },

    // key generation
    generateMask: function (canvasCode) {
        "use strict";
        var imgData;
        var i;
        var divElement = document.createElement("div");
        var canvas = document.createElement("canvas");
        // 7680 pixels ?? 4320 is the highest UHD 8K TV resolution as of 2017
        // but that would create (probably) unnecessarily large key files
        canvas.width = 1920;
        canvas.height = 1080;
        //canvas.getContext("2d").drawImage(canvasCode, 0, 0);
        divElement.appendChild(canvas);
        document.getElementById("key").appendChild(divElement);

        imgData = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
        for (i = 0; i < imgData.data.length; i = i + 4) {
            imgData.data[i] = this.getValue(Math.min); //0
            imgData.data[i + 1] = this.getValue(Math.max); //255
            imgData.data[i + 2] = this.getValue(Math.max); //255
            imgData.data[i + 3] = 255; //255
        }

        canvas.getContext("2d").putImageData(imgData, 0, 0);

        // return just the portion needed to hide the code
        imgData = canvas.getContext("2d").getImageData(0, 0, canvasCode.width, canvasCode.height);
        return imgData.data;
    },

    combineImages: function (canvasCode, canvasFacade) {
        "use strict";
        var div = document.createElement("div");
        var canvas = document.createElement("canvas");
        var context;
        var i;
        var hiddenData;
        var imgData;
        var width;
        var height;
        var mask;

        // The new canvas needs to be the size of the facade
        canvas.width = canvasFacade.width;
        canvas.height = canvasFacade.height;
        context = canvas.getContext("2d");
        context.drawImage(canvasFacade, 0, 0);
        div.appendChild(canvas);
        document.getElementById("result").appendChild(div);

        // We need to iterate over only the overlapping pixels
        // If the images are different dimensions, we can only use the intersection
        width = Math.min(canvasCode.width, canvasFacade.width);
        height = Math.min(canvasCode.height, canvasFacade.height);
        hiddenData = canvasCode.getContext("2d").getImageData(0, 0, width, height);
        imgData = canvasFacade.getContext("2d").getImageData(0, 0, width, height);

        // get key/mask data
        if (this.useCustomKey && this.hasKeyImage()) {
            mask = this.keyImage.shift().getContext("2d").getImageData(0, 0, width, height).data;
        } else {
            mask = this.generateMask(canvasCode);
        }

        for (i = 0; i < imgData.data.length; i = i + 4) {
            //imgData.data[i] = imgData.data[i] | ((imgData.data[i] & 1) ^ (1 & mask[i]));
            // If the hiddenData value is 0 (black) we want the 1-bit to be black
            // If the hiddenData value is 1 (white) we want the 1-bit to be white
            if ((hiddenData.data[i] & 1) ^ (mask[i] & 1)) {
                imgData.data[i] = imgData.data[i] | 1; // one LSB
            } else {
                imgData.data[i] = imgData.data[i] & 254; // zero LSB
            }
        }
        // hack to preserve PNGs on some platforms by introducing partial transparency
        imgData.data[imgData.data.length - 1] = 254;
        context.putImageData(imgData, 0, 0);
    },

    toggleKey: function () {
        "use strict";
        var headerText = "Default Key";
        var linkText = "Enable Custom Key";
        this.useCustomKey = !this.useCustomKey;
        if (this.useCustomKey) {
            headerText = "Custom Key";
            linkText = "Disable Custom Key";
        }
        document.getElementById("keydrop").textContent = linkText;
        document.getElementById("keyContainer").getElementsByTagName("h3")[0].textContent = headerText;
    },

    loadimg: function (file, id) {
        "use strict";
        var self = this;
        var iid = id;
        var reader = new FileReader();
        var img = document.createElement("img");

        img.file = file;
        reader.onload = (function (aImg) {
            return function (e) {
                aImg.src = e.target.result;
            };
        }(img));
        reader.readAsDataURL(file);

        // we need to wait for the image to load to continue processing
        img.onload = function () {
            var divElement = document.createElement("div");
            var canvasElement = document.createElement("canvas");
            var ctxTemp;

            canvasElement.id = iid.replace("drop", "Canvas");
            canvasElement.width = img.width;
            canvasElement.height = img.height;
            ctxTemp = canvasElement.getContext("2d");
            ctxTemp.drawImage(img, 0, 0);

            if (iid.indexOf("code") >= 0) {
                // convert to black and white
                self.onebit(canvasElement);
                // enqueue the image onto the queue of code images
                self.codeImage.push(canvasElement);
                // add the div & canvas to the page
                divElement.appendChild(canvasElement);
                document.getElementById("code").appendChild(divElement);
            }

            if (iid.indexOf("facade") >= 0) {
                // enqueue the image onto the queue of facade images
                self.facadeImage.push(canvasElement);
                // add the div & canvas to the page
                divElement.appendChild(canvasElement);
                document.getElementById("facade").appendChild(divElement);
            }

            if (iid.indexOf("key") >= 0) {
                canvasElement.id = "keyCanvas";
                if (!self.useCustomKey) {
                    self.toggleKey();
                }
                // enqueue the image onto the queue of key images
                self.keyImage.push(canvasElement);
                // add the div & canvas to the page
                divElement.appendChild(canvasElement);
                document.getElementById("key").appendChild(divElement);
            }

            while (self.hasCodeImage() && self.hasFacadeImage()) {
                self.combineImages(self.codeImage.shift(), self.facadeImage.shift());
            }

        };

    }

};
