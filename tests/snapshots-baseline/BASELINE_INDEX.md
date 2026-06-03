# Baseline Snapshot Index

Date: 2026-05-16

Use this table to track baseline captures for each regression scene and output format.

| Scene ID | Scene Title | Preview | PNG | JPG | MP4 frame 0 | MP4 mid | MP4 end | Embed frame 0 | Embed mid | Embed end | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S01_basic_shape_motion | Basic shape + motion + text composite | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| S02_mixed_motion_composite | Mixed layered composite with motion and effects | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| S03_text_multiline_boxwrap | Text multiline with box wrap and alignment | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| S04_shape_gradient_fill | Shape with gradient/ramp fill | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| S05_image_text_composite | Image + text mixed composite | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| S06_image_mask_shape_or_pen | Image masked by shape or pen | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| S07_animated_mask_motion | Animated mask over moving content | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| S08_nested_composite_blend | Nested composite with multiple blend modes | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| S09_transform_stylize_mask_chain | Transform chain with stylize and mask | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| S10_direct_image_output_stress | Direct image output object-fit stress | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |
| S11_transparent_png_case | Transparent PNG output | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | |

## Capture convention

- Preview: save as tests/snapshots-baseline/<scene-id>/preview.png
- PNG: save as tests/snapshots-baseline/<scene-id>/export.png
- JPG: save as tests/snapshots-baseline/<scene-id>/export.jpg
- MP4 sampled frames: save as tests/snapshots-baseline/<scene-id>/mp4_f000.png, mp4_fmid.png, mp4_fend.png
- Embed sampled frames: save as tests/snapshots-baseline/<scene-id>/embed_f000.png, embed_fmid.png, embed_fend.png
