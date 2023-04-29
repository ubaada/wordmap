var countryNames = [];
var quotes = [];
var quoteIntervalID = 0;
var mymap = null;
// execuute this code when page loads
window.onload = function() {
  // load common country names
  loadCountryNames();
  // load loading quotes
  loadQuotes();
  // fire drawMap when Submit button is clicked
  document.getElementById('submit-btn').addEventListener('click', drawMap); 
  // show hide settings div when settings-btn is clicked
  document.getElementById('settings-btn').addEventListener('click', function() {
    if (document.getElementById('settings').style.display === 'none') {
      document.getElementById('settings').style.display = 'flex';
    } else {
      document.getElementById('settings').style.display = 'none';
    }
  });  
  // show hide color scale when color-legend-checkbox checkbox is checked/unchecked
  document.getElementById('color-legend-checkbox').addEventListener('change', toggleColorScale);
  // unchecked by default if display is mobile
  if (window.innerWidth < 600) {
    document.getElementById('color-legend-checkbox').checked = false;
  }



  // fire drawMap when Enter key is pressed
  document.getElementById("inp-box").addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      drawMap();
    }
  });

  // load color schemes
  loadColorSchemes();

  // change color scheme when color scheme picker is changed
  document.getElementById('color-scheme-picker').addEventListener('change', changeColorScheme);
    
};

// draws map based on input text
function drawMap() {
    // hide map div
    document.getElementById('map').style.display = 'none';
    // hide map-placeholder display none
    document.getElementById('map-placeholder').style.display = 'none';
    // show loading display block
    document.getElementById('loading').style.display = 'block';
    // show the spiiner div
    document.getElementById('spinner').style.display = 'block';
    document.getElementById('status-text').innerHTML = '';

    // get the text from the input box
    const text = document.getElementById('inp-box').value;
    // get similarity method from similarity-method dropdown
    const similarityMethod = document.getElementById('similarity-method').value;
    // negative set to "true" if negative-vector-checkbox is checked
    const negative = document.getElementById('negative-vector-checkbox').checked;
    // if text is empty or contains more than 200 characters, show error
    if (text.trim() === '' || text.length > 200) {
      showmsg('Please enter a valid text (max 200 characters)');
      return;
    }
    // start showing loading quotes
    quoteIntervalID = showRandomQuote();

    siteKey = '6Lf42bYlAAAAAAd8VmBwuqwfkQloUWu6qh_NjcT5';
    // Get a reCAPTCHA v3 token
    grecaptcha.execute(siteKey, {action: 'submit'})
      .then(function(token) {
        const url = '/calc.php';
        const formData = new FormData();
        formData.append('text', text);
        formData.append('sim_method', similarityMethod);
        formData.append('negative', negative);
        formData.append('token', token);

        // send post data to calc.php including captcha token
        fetch(url, {
          method: 'POST',
          body: formData
        })
        .then(response => response.text())
        .then(csv => {
          const lines = csv.split("\n").filter(line => line.trim() !== "");
          const countryCodes = [];
          const similarities = [];
          lines.forEach(line => {
            const [code, similarity] = line.split(",");
            countryCodes.push(code);
            similarities.push(parseFloat(similarity));
          });

          var color_scale = document.getElementById('color-scheme-picker').value;
          const data = [{
            type: "choropleth",
            locationmode: "ISO-3",
            locations: countryCodes,
            z: similarities,
            text: countryNames,
            colorscale: color_scale,
            reversescale: true,
            colorbar: {
              visible: false
            }
          }];
          // set map size to 100% of #map div
          var h = document.getElementById('map-container').offsetHeight;
          var w = document.getElementById('map-container').offsetWidth;
          const layout = {
            geo: {
              projection: { type: "equirectangular" }
            },
            legend: {"orientation": "h"},
            showlegend: true,
            margin: { t: 0, b: 0, l: 0, r: 0 },
            pad: 0,
            height: h,
            width: w,
            paper_bgcolor: '#ffffff00',
            plot_bgcolor: '#ffffff00'
          };

          // var config = {responsive: true}

          mymap = Plotly.newPlot("map", data, layout);

          // hide color scale from plot if color-legend-checkbox is unchecked
          scaleEnabled = document.getElementById('color-legend-checkbox').checked;
          Plotly.restyle("map", {showscale: scaleEnabled});
          

          // stop showing loading quotes
          clearInterval(quoteIntervalID);
          // hide loading display none
          document.getElementById('loading').style.display = 'none';
          // show map display block
          document.getElementById('map').style.display = 'block';
        })
        .catch(error => {
          // stop showing loading quotes
          clearInterval(quoteIntervalID);
          showmsg('Error: ' + error);
        });
  });
}



// puts error response in div with id = "resp"
function showmsg(text) {
  // show error in status-text div
  document.getElementById('status-text').innerHTML = text;
  // hide map div
  document.getElementById('map').style.display = 'none';
// hide map-placeholder display none
  document.getElementById('map-placeholder').style.display = 'none';
  // hide the div with class name spinner
  document.getElementById('spinner').style.display = 'none';
  // show loading div
  document.getElementById('loading').style.display = 'block';
}
  
// loads common country names
function loadCountryNames() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'public-data/common-countries.txt', true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      countryNames = xhr.responseText.split('\n');
      }
  };
  xhr.send();
};


// show/hide color scale if color-legend-checkbox is checked/unchecked
// check if map is not null first
function toggleColorScale() {
  if (mymap) {
    if (document.getElementById('color-legend-checkbox').checked) {
      Plotly.restyle("map", {showscale: true});
    } else {
      Plotly.restyle("map", {showscale: false});
    }
  }
}

// loads loading quotes
function loadQuotes() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'public-data/quotes.txt', true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      quotes = xhr.responseText.split('\n');
      }
  };
  xhr.send();
}

// shows a random quote in #status-text with 3 second interval
// until stopped by a function call
// first quote is shown immediately
function showRandomQuote() {
  var quote = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById('status-text').innerHTML = '> ' + quote + '...';
  var i = setInterval(function() {
    var quote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('status-text').innerHTML = '> ' + quote + '...';
  }, 3000);
  // stop showing quotes by clearing timeout in the upstream function
  // clearTimeout(i);
  return i;
}

// load color schemes from public-data/color-schemes.txt
// and populate the color-scheme-picker dropdown
function loadColorSchemes() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'public-data/color-schemes.txt', true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var colorSchemes = xhr.responseText.split('\n');
      colorSchemes.forEach(colorScheme => {
        var option = document.createElement("option");
        // strip return carriage character from color scheme name
        colorScheme = colorScheme.replace('\r', '');
        option.text = colorScheme;
        option.value = colorScheme;
        document.getElementById('color-scheme-picker').add(option);
      });
      // set default color scheme to YlGnBu
      document.getElementById('color-scheme-picker').value = 'YlGnBu';
    }
  };
  xhr.send();
}

// change color scheme of map when color scheme picker is changed
// and if mymap plot is already loaded in map div
function changeColorScheme() {
  if (mymap) {
    var color_scheme = document.getElementById('color-scheme-picker').value;
    Plotly.restyle("map", {colorscale: color_scheme});
  }
}