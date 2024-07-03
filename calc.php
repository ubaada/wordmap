<?php
# =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
#
#                     MAIN WORKFLOW
#
# =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
# Returns a csv with country codes and cosine similarities
# Setup
#     Enable curl extension in php.ini
#     Enable SSL https call support for curl in php.ini (ssl certs)
#     Enable json extension in php.ini
#     Enable APCu for caching, binary needs to be set up

# Expected POST parameters
#     text: text to be compared to country embeddings
#     sim_method: similarity method to be used, cosine or euclidean
#     negative: whether to use negative embeddings or not
#     token: captcha token from google recaptcha v3

# check if any of the expected POST parameters are not set or empty
if (isset($_POST['text']) == false || isset($_POST['sim_method']) == false || isset($_POST['negative']) == false || isset($_POST['token']) == false) {
    http_response_code(400);
    die("Missing parameters");
}
if (strlen($_POST['text']) == 0 || strlen($_POST['sim_method']) == 0 || strlen($_POST['negative']) == 0 || strlen($_POST['token']) == 0) {
    http_response_code(400);
    die("Missing parameters");
}

# load POST parameters
$text = htmlspecialchars($_POST['text']);
$sim_method = htmlspecialchars($_POST['sim_method']);
$negative = htmlspecialchars($_POST['negative']);
$token = htmlspecialchars($_POST['token']);


verify_captcha();

$prompt_limit = 200;
# sanitize the text input and store in $text
$text = htmlspecialchars($_POST['text']);
# kill the script if the text is empty or too long
if (strlen($text) == 0) {
    http_response_code(400);
    die("Text is empty");
} else if (strlen($text) > $prompt_limit) {
    http_response_code(400);
    die("Text is too long. Maximum is 200 characters.");
}
# read openai api key from the config file
$openai_api_key = load_openai_key();
# Get word/sentence embeddings from OpenAI
$word_embedding = get_embeddings($text, $openai_api_key);
# if negative is set, get negative embeddings
if ($negative == "true") {
    $word_embedding = negate_vector($word_embedding);
}
# load $country_codes and $country_embeddings from load_country_embeddings()
list($country_codes,$country_embeddings) = load_stored_embeddings();
# calculate similarity between the text and each country embedding using array map
$similarities = [];
foreach ($country_embeddings as $embedding) {
    # choose similarity method based on user input
    if ($sim_method == "cosine") {
        $similarity = get_cosine_similarity($word_embedding, $embedding);
    } else if ($sim_method == "euclidean") {
        $similarity = get_euclidean_distance($word_embedding, $embedding);
    } else {
        # defaults to cosine similarity
        $similarity = get_cosine_similarity($word_embedding, $embedding);
    }
    $similarity = get_cosine_similarity($word_embedding, $embedding);
    array_push($similarities, $similarity);
}
// # return a csv with country names and cosine similarities
$csv = [];
for ($i = 0; $i < count($country_codes); $i++) {
    $csv[] = $country_codes[$i] . "," . $similarities[$i];
}
# return csv
echo implode("\n", $csv);


# =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
# 
#                     HELPER FUNCTIONS
#
# =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
# 1. verify_captcha: verify captcha token
# 2. load_openai_key: load openai api key from the config file
# 3. load_stored_embeddings: load country embeddings from the csv file
# 4. get_embeddings: get word/sentence embeddings from OpenAI
# 5. get_cosine_similarity: calculate cosine similarity between two vectors
# 6. get_euclidean_distance: calculate euclidean distance between two vectors
# 7. negate_vector: negate a vector
# =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-


function verify_captcha() {
	# if empty/not set kill the script and return error header
	if (!isset($_POST['token'])) {
		http_response_code(400);
		die("Captcha verification not provided.");
	}
    $token = htmlspecialchars($_POST['token']);
    $secretKey = file_get_contents('../word-map-data/pvt-v3-key');

    $ch = curl_init("https://www.google.com/recaptcha/api/siteverify?secret=".$secretKey."&response=".$token);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    # check if curl request got through
    if ($response != false) {
        # check if gooogle api returned success in json
        $verification_json = json_decode($response);
        if (isset($verification_json->success) && $verification_json->success == true) {
            return true;
        }
    } 
    # if not success kill the script and return error
    die("Captcha verification failed. Nice try tho.");
}

# load open ai key from the config file in a more efficient way
# to reduce to disk read
function load_openai_key() {
    if (apcu_exists('openai_api_key')) {
        return apcu_fetch('openai_api_key');
    } else {
        return file_get_contents('../word-map-data/wv-openai-key.txt');
    }
}

# load country embeddings from the csv file in a more efficient way
function load_stored_embeddings() {

    $country_codes = [];
    $country_embeddings = [];

    $enable_cache = true; # set to false for debugging, true for production

    # load from APCu cache if available
    if (apcu_exists('country_codes') && apcu_exists('country_embeddings') && $enable_cache) {
        $country_codes = apcu_fetch('country_codes');
        $country_embeddings = apcu_fetch('country_embeddings');
    } else {
        # load country names and embeddings from json variable
        # json is stored as {'country_name': 'embedding','country_name': 'embedding'}...
        $json_text = "";
        # error check while reading file, die if error and clear cache
        if (!$json_text = file_get_contents('../word-map-data/embeddings_with_code.json')) {
            apcu_clear_cache();
            die("Error on the server side :(");
        }
        $country_json = json_decode($json_text);
        foreach ($country_json as $key => $value) {
            $country_codes[] = $key;
            $country_embeddings[] = $value;
        }
        # store in APCu cache
        apcu_store('country_codes', $country_codes);
        apcu_store('country_embeddings', $country_embeddings);
    }
    return array($country_codes, $country_embeddings);
}

# get embeddings from the open ai
function get_embeddings($text, $key) {
    $url = "https://api.openai.com/v1/embeddings";
    $data = array(
        "input" => $text,
        "model" => "text-embedding-3-small"
    );
    $payload = json_encode($data);

    $headers = array(
        "Authorization: Bearer $key",
        "Content-Type: application/json"
    );
    # extension=php_curl.dll needs to be enabled in php.ini
    # also set up SSL certificate in php.ini if needed
    $ch = curl_init($url);

    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $result = curl_exec($ch);
    if ($result === false) {
        echo 'Curl error: ' . curl_error($ch);
    } else {
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($http_code != 200) {
            echo 'API error: ' . $result;
        } else {
            # success
            $response = json_decode($result);
            # extract ["data"][0]["embedding"] from the response
            $embedding = $response->{"data"}[0]->{"embedding"};
            return $embedding;
        }
    }
    curl_close($ch);
}
# calculate cosine similarity between two vectors
function get_cosine_similarity($a, $b) {
    $dot_product = 0;
    $magnitude_a = 0;
    $magnitude_b = 0;
    for ($i = 0; $i < count($a); $i++) {
        $dot_product += ($a[$i] * $b[$i]);
        $magnitude_a += pow($a[$i], 2);
        $magnitude_b += pow($b[$i], 2);
    }
    $magnitude_a = sqrt($magnitude_a);
    $magnitude_b = sqrt($magnitude_b);
    if ($magnitude_a == 0 || $magnitude_b == 0) {
        return 0;
    } else {
        return $dot_product / ($magnitude_a * $magnitude_b);
    }
}

# calculate euclidean distance between two vectors
function get_euclidean_distance($a, $b) {
    $sum = 0;
    for ($i = 0; $i < count($a); $i++) {
        $sum += pow(($a[$i] - $b[$i]), 2);
    }
    return sqrt($sum);
}

# calculate negation of a vector
function negate_vector($a) {
    $result = array();
    for ($i = 0; $i < count($a); $i++) {
        $result[$i] = -$a[$i];
    }
    return $result;
}
?>