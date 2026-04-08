window.onload = function() {
  //<editor-fold desc="Changeable Configuration Block">

  // the following lines will be replaced by docker/configurator, when it runs in a docker-container
  var qs = new URLSearchParams(window.location.search);
  var sc = (qs.get('scope') || '').toLowerCase();
  var specUrl = '/swagger/json';
  if (sc === 'admin' || sc === 'app') {
    specUrl = '/swagger/json/' + sc;
  }
  window.ui = SwaggerUIBundle({
    url: specUrl,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  });

  //</editor-fold>
};
