extends SceneTree


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	if args.is_empty():
		push_error("Pass a res:// OGV path after --")
		quit(1)
		return

	var video_path: String = args[0]
	var stream := load(video_path)
	if not stream is VideoStreamTheora:
		push_error("Expected VideoStreamTheora: %s" % video_path)
		quit(1)
		return

	var player := VideoStreamPlayer.new()
	root.add_child(player)
	player.stream = stream
	await process_frame
	player.play()
	await process_frame
	if not player.is_playing():
		push_error("VideoStreamPlayer did not start: %s" % video_path)
		quit(1)
		return

	print("VideoStreamTheora playback started: %s" % video_path)
	quit(0)
