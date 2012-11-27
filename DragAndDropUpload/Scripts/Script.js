var inFlightFiles = [];

function dragEnter(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    $(evt.target).addClass('over');
}

function dragLeave(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    $(evt.target).removeClass('over');
}

function dragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
}

function drop(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    $(evt.target).removeClass('over');

    var files = evt.originalEvent.dataTransfer.files;

    if (files.length > 0) {
        if (window.FormData !== undefined) {
            var data = new FormData();
            for (i = 0; i < files.length; i++) {
                chunkedUpload(i, files[i]);
            }       
        } else {
            alert("your browser sucks!");
        }
    }
}

function chunkedUpload(fileindex, blob) {

    //create file tracker
    inFlightFiles[fileindex] = ({
        fileindex: fileindex,
        chunks: {},
        allChunksListed: false,
        name:blob.name
    });


     var BYTES_PER_CHUNK = 1024 * 1024;
        // 1MB chunk sizes.
     var SIZE = blob.size;
        var start = 0;
        var end = BYTES_PER_CHUNK;
        var blobNum = 0;
        while (start < SIZE) {
            var chunk = blob.slice(start, end);

            upload(fileindex, blobNum, chunk);

            start = end;
            end = start + BYTES_PER_CHUNK;
            blobNum++;
        }
        
    //mark all chunks as listed
        inFlightFiles[fileindex].allChunksListed = true;

        return true;
}

function upload(fileIndex, blobIndex, blobOrFile) {
    inFlightFiles[fileIndex].chunks[blobIndex] = { serverId: '', uploaded:false }

    var data = new FormData();
    var result;
    data.append(fileIndex + "," + blobIndex, blobOrFile);
    $.ajax({
        type: "POST",
        url: "/api/uploading",
        contentType: false,
        processData: false,
        data: data,
        success: function (res) {
            $.each(res, function (i, item) {
                viewModel.uploads.push(item);
                inFlightFiles[item.clientfileindex].chunks[item.clientblobindex].serverId = item.name;
                inFlightFiles[item.clientfileindex].chunks[item.clientblobindex].uploaded = true;
                if (areAllBlocksUploaded(item.clientfileindex))
                {
                    sendFileCompleteMessage(item.clientfileindex);
                }
            });
        }
    });
}

function areAllBlocksUploaded(fileIndex)
{
    if (inFlightFiles[fileIndex].allChunksListed != true)
    {
        return false;
    }

    for (var i in inFlightFiles[fileIndex].chunks)
    {
        if (inFlightFiles[fileIndex].chunks[i].uploaded == false)
        {
            return false;
        }
    }

    return true;
}

function sendFileCompleteMessage(fileIndex)
{
    var blocks = [];
    var filename = inFlightFiles[fileIndex].name;

    for (var i in inFlightFiles[fileIndex].chunks) {
        blocks.push(inFlightFiles[fileIndex].chunks[i].serverId);
    }

    $.ajax({
        type: "POST",
        url: "/api/fileassembly",
        dataType: 'json',
        data: { filename: filename, blocks: blocks },
        success: function (res) {
            alert('upload complete');
        }
    });
}



$(document).ready(function () {
    var $box = $("#ulbox");
    $box.bind("dragenter", dragEnter);
    $box.bind("dragover", dragOver);
    $box.bind("dragleave", dragLeave);
    $box.bind("drop", drop);
});

var viewModel = { uploads: ko.observableArray([]) }
ko.applyBindings(viewModel);