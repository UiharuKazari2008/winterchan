<html>
<head>
<title>Winterchan Banners</title>
</head>
<body>
<?php
function listBannersInDir($dir) {
    if ($handle = opendir($dir)) {
        while (false !== ($entry = readdir($handle))) {
            if ($entry != "." && $entry != "..") {
                echo "<a href=\"$dir/$entry\"><img src=\"$dir/$entry\" alt=\"$entry\" style=\"width:400px;height:225px\"></a> ";
            }
        }
        closedir($handle);
    }
}

listBannersInDir("banners2_priority");
listBannersInDir("banners2");
?>
</body>
</html>
