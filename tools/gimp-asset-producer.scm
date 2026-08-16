(define (script-fu-shrink-cut-blur image drawable)
  (let* ((layer drawable))
    (gimp-image-undo-group-start image)

    ; ensure alpha channel
    (if (= (car (gimp-drawable-has-alpha layer)) FALSE)
      (gimp-image-set-active-layer image layer))
    (if (= (car (gimp-drawable-has-alpha layer)) FALSE)
      (gimp-layer-add-alpha layer))

    ; invert, grow 20px, invert back (shrinks original selection by 20px)
    (gimp-selection-invert image)
    (gimp-selection-grow image 20)
    (gimp-selection-invert image)

    ; cut, exposing transparency
    (gimp-edit-cut layer)

    ; grow selection 20px, then blur
    (gimp-selection-grow image 20)
    (plug-in-gauss RUN-NONINTERACTIVE image layer 3 3 0)

    (gimp-image-undo-group-end image)
    (gimp-displays-flush)))

(script-fu-register
  "script-fu-shrink-cut-blur"
  "Shrink Selection, Cut, Blur"
  "Ensures alpha, shrinks selection by 20px via double-invert-grow, cuts, grows again, and gaussian blurs"
  "Claude"
  "Claude"
  "2026"
  "RGBA* RGB* GRAY*"
  SF-IMAGE "Image" 0
  SF-DRAWABLE "Drawable" 0
)

(script-fu-menu-register "script-fu-shrink-cut-blur" "<Image>/Filters/Custom")