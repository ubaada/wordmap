var countryNames = [];

// execuute this code when page loads
window.onload = function() {
  // load common country names
  loadCountryNames();
  // fire drawMap when Submit button is clicked
  document.getElementById('submit-btn').addEventListener('click', drawMap); 
  // show hide settings div when settings-btn is clicked
  document.getElementById('settings-btn').addEventListener('click', function() {
    if (document.getElementById('settings').style.display === 'none') {
      document.getElementById('settings').style.display = 'block';
    } else {
      document.getElementById('settings').style.display = 'none';
    }
  });  
  // show hide color scale when color-scale-btn is clicked
  document.getElementById('color-scale-btn').addEventListener('click', toggleColorScale);

  // fire drawMap when Enter key is pressed
  document.getElementById("inp-box").addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      drawMap();
    }
    });
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
    // captcha v3 token
    const token = '1234567890';
    // if text is empty or contains more than 200 characters, show error
    if (text.trim() === '' || text.length > 200) {
      showmsg('Please enter a valid text (max 200 characters)');
      return;
    }

    siteKey = '6Lf42bYlAAAAAAd8VmBwuqwfkQloUWu6qh_NjcT5';
    // Get a reCAPTCHA v3 token
    grecaptcha.execute(siteKey, {action: 'submit'})
      .then(function(token) {
        const url = '/calc.php';
        const formData = new FormData();
        formData.append('text', text);
        formData.append('sim_method', similarityMethod);
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

          
          const data = [{
            type: "choropleth",
            locationmode: "ISO-3",
            locations: countryCodes,
            z: similarities,
            text: countryNames,
            colorscale: "Blues",
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

          Plotly.newPlot("map", data, layout);

          // hide color scale from plot if display is mobile
          if (window.innerWidth < 768) {
            Plotly.restyle("map", {showscale: false});
            // change text of color-scale-btn to show color scale
            document.getElementById('color-scale-btn').innerHTML = 'Show Scale';
          }
          
          // enable color scale button
          document.getElementById('color-scale-btn').disabled = false;

          // hide loading display none
          document.getElementById('loading').style.display = 'none';
          // show map display block
          document.getElementById('map').style.display = 'block';
        })
        .catch(error => showmsg(error));
  });
}



// puts text response in div with id = "resp"
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


// show/hide color scale
function toggleColorScale() {
  if (document.getElementById('color-scale-btn').innerHTML === 'Show Scale') {
    Plotly.restyle("map", {showscale: true});
    document.getElementById('color-scale-btn').innerHTML = 'Hide Scale';
  } else {
    Plotly.restyle("map", {showscale: false});
    document.getElementById('color-scale-btn').innerHTML = 'Show Scale';
  }
}