function seek_01_handler()
    mp.command("seek 10");
    print("ack / =");

    mp.command("show_progress");
end
mp.add_key_binding("=", "seek01", seek_01_handler)

function seek_b01_handler()
    mp.command("seek -10");
    print("ack / [");

    mp.command("show_progress");
end
mp.add_key_binding("[", "seekb01", seek_b01_handler)

function seek_1_handler()
    mp.command("seek 60");
    print("ack / !");

    mp.command("show_progress");
end
mp.add_key_binding("!", "seek1", seek_1_handler)

function seek_b1_handler()
    mp.command("seek -60");
    print("ack / *");
    mp.command("show_progress");
end
mp.add_key_binding("*", "seekb1", seek_b1_handler)


function seek_10_handler()
    mp.command("seek 600");
    print("ack / @");
    mp.command("show_progress");
end
mp.add_key_binding("@", "seek10", seek_10_handler)

function seek_b10_handler()
    mp.command("seek -600");
    print("ack / $");
    mp.command("show_progress");
end
mp.add_key_binding("$", "seekb10", seek_b10_handler)

function stat_handler()

    status = "status / " .. mp.get_property_osd("time-pos") .. " / " .. mp.get_property_osd("length")
    print("ack / %")
    print(status)
end
mp.add_key_binding("%", "stat", stat_handler)

function seek_start_handler()
    mp.command("seek -60000");
    print("ack / ^");
    mp.command("show_progress");
end
mp.add_key_binding("^", "seekstart", seek_start_handler)

function cpause_handler()
    mp.command("cycle pause");
    print('ack / (');
end
mp.add_key_binding("(", "cpause", cpause_handler)

function cmute_handler()
    mp.command("cycle mute");
    print('ack / )');
end
mp.add_key_binding(")", "cmute", cmute_handler)

function quit_handler()
    mp.command("quit_watch_later");
    print('ack / -');
end
mp.add_forced_key_binding("-", "myquit", quit_handler)

function caudio_handler()
    mp.command("cycle audio");
    print('ack / :');
end
mp.add_key_binding(":", "caudio", caudio_handler)

print("Keys bound in script " .. mp.get_script_name())
