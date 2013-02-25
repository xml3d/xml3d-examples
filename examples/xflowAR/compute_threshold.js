// Histogram processing
Xflow.registerOperator("createNormalizedHistogram", {
    outputs:[
        {type:'float', name:'histogram', customAlloc:true}
    ],
    params:[
        {type:'texture', source:'input'},
        {type:'int', source:'channel'}
    ],
    alloc:function (sizes, input) {
        sizes['histogram'] = 256;
    },
    evaluate:function (histogram, input, channel) {
        if (channel[0] < 0 || channel[0] > 2)
            throw "Invalid channel: channel must be 0, 1 or 2";
        var s = input.data;
        // reset histogram to 0
        for (var i = 0; i < histogram.length; ++i)
            histogram[i] = 0;
        // compute histogram
        for (var i = 0; i < s.length; i += 4)
            histogram[s[i + channel[0]]]++;
        // normalize histogram
        for (var i = 0; i < histogram.length; i++)
            histogram[i] /= (input.width * input.height);
    }
});

Xflow.registerOperator("grayscale", {
    outputs:[
        {type:'texture', name:'output', sizeof:'input'}
    ],
    params:[
        {type:'texture', source:'input'}
    ],
    evaluate:function (output, input) {
        var s = input.data;
        var d = output.data;
        for (var i = 0; i < s.length; i += 4) {
            // CIE luminance        (HSI Intensity: Averaging three channels)
            d[i] = d[i + 1] = d[i + 2] = 0.2126 * s[i] + 0.7152 * s[i + 1] + 0.0722 * s[i + 2];
            d[i + 3] = s[i + 3];
        }
        return true;
    }
});

// Based on http://www.labbookpages.co.uk/software/imgProc/otsuThreshold.html#java
Xflow.registerOperator("getOtsuThreshold", {
    outputs:[
        {type:'int', name:'threshold', customAlloc: true}
    ],
    params:[
        {type:'float', source:'histogram'} // normalized histogram Sum(histogram) == 1.0
    ],
    alloc:function (sizes, input) {
        sizes['threshold'] = 1;
    },
    evaluate:function (threshold, histogram) {
        var sum = 0;
        for (var t = 0; t < 256; t++)
            sum += t * histogram[t];

        var sumB = 0;
        var wB = 0; // weight background
        var wF = 0; // weight foreground

        var varMax = 0; // maximum variance
        var Thresh = 0;
        threshold[0] = 0;

        // Step through all possible thresholds
        for (var t = 0; t < 256; t++) {
            wB += histogram[t];                 // Weight Background
            if (wB == 0)
                continue;

            wF = 1.0 - wB;                    // Weight Foreground
            if (wF == 0)
                break;

            sumB += (t * histogram[t]);

            var mB = sumB / wB;                             // Mean Background
            var mF = (sum - sumB) / wF;             // Mean Foreground

            // Calculate Between Class Variance
            var varBetween = wB * wF * (mB - mF) * (mB - mF);

            // Check if new maximum found
            if (varBetween > varMax) {
                varMax = varBetween;
                threshold[0] = t;
            }
        }
    }
});
