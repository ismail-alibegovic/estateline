(function () {
  var script = document.currentScript
  var token = script?.dataset?.orgSlug
  var baseUrl = script?.dataset?.baseUrl || 'https://app.estateline.dev'
  if (!token) {
    console.error('estateline-widget: missing data-org-slug')
    return
  }

  var iframe = document.createElement('iframe')
  iframe.src = baseUrl + '/widget/form?token=' + encodeURIComponent(token)
  iframe.style.cssText = 'position:fixed;bottom:20px;right:20px;width:60px;height:60px;border:none;border-radius:50%;z-index:9999;cursor:pointer;background:#2563eb;box-shadow:0 4px 12px rgba(0,0,0,.3)'
  iframe.title = 'Real Estate Inquiry'
  document.body.appendChild(iframe)

  var hidden = true
  var full = null

  iframe.addEventListener('click', function () {
    if (hidden) {
      hidden = false
      iframe.style.transition = 'width .3s, height .3s'
      iframe.style.width = '420px'
      iframe.style.height = '600px'
      iframe.style.borderRadius = '12px'
    } else {
      hidden = true
      iframe.style.width = '60px'
      iframe.style.height = '60px'
      iframe.style.borderRadius = '50%'
    }
  })
})()
