# Libre Office Onlie

This application is the front-end connector of the Libre Office Online suite.
It needs to connect to a working LibreOffice document server.

The application allows to open/edit commons document, presentation, and spreedsheet.
It support a wide range of documents.

![https://github.com/lxsang/antosdk-apps/blob/master/LibreOffice/libreoffice.png?raw=true](https://github.com/lxsang/antosdk-apps/blob/master/LibreOffice/libreoffice.png?raw=true)

## Change log
- v 0.1.4-a:
    * Update backend script to latest API changes
    * use luasocket + luasec to fetch LibreOffice service discovery
- v 0.1.3-a:
    * Minor fix to support AntOS v2.0.x
- v 0.1.2-a:
    * Fix server side API error with new backend API
- v 0.1.1-a:
    * improve UI handling
    * add Save as option
    * add traditional AntOS application File menu
    * fetch supported mimes from discovery URL
- v 0.1.0-a: Initial version
