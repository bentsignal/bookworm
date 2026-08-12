Pod::Spec.new do |s|
  s.name             = 'WormPdf'
  s.version          = '1.0.0'
  s.summary          = 'Native PDF reading and text extraction for Worm'
  s.description      = 'Uses Apple PDFKit to read local PDFs without a network service.'
  s.author           = 'Worm'
  s.homepage         = 'https://github.com/bentsignal/worm'
  s.platforms        = { :ios => '16.4' }
  s.source           = { :git => 'https://github.com/bentsignal/worm.git' }
  s.static_framework = true
  s.swift_version    = '5.9'

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
